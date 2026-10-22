// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Playground-only tracing. `@thunderid/node` has no debug event stream, so the playground builds
 * the SDK trace of an operation from three sources:
 *
 * - the SDK's own logger, through its public `formatter` hook (`logger.configure()`);
 * - wrappers around the client's methods, including the protected ones the public methods call,
 *   so nested SDK calls show up under the operation that made them;
 * - a wrapper around `fetch`, which the SDK uses for every request to ThunderID. It also keeps the
 *   request and response, which the explorer shows on its HTTP tab.
 *
 * Each operation runs inside an `AsyncLocalStorage` context that collects its steps.
 */

import {AsyncLocalStorage} from 'node:async_hooks';
import {logger, type LogLevel, type ThunderIDNodeClient, type ThunderIDNodeManagementClient} from '@thunderid/node';

export type TraceKind = 'ok' | 'info' | 'warn' | 'error';

export type TraceSource = 'client' | 'http' | 'log';

export interface TraceStep {
  at: number;
  depth: number;
  detail: string;
  durationMs?: number;
  kind: TraceKind;
  source: TraceSource;
  step: string;
}

export interface HttpExchange {
  durationMs?: number;
  error?: string;
  method: string;
  requestBody?: string;
  requestHeaders: [string, string][];
  responseBody?: string;
  responseHeaders: [string, string][];
  status?: number;
  statusText?: string;
  url: string;
}

export interface Traced<R> {
  error?: unknown;
  ms: number;
  ok: boolean;
  requests: HttpExchange[];
  steps: TraceStep[];
  value?: R;
}

interface TraceContext {
  depth: number;
  requests: HttpExchange[];
  start: number;
  steps: TraceStep[];
}

const storage: AsyncLocalStorage<TraceContext> = new AsyncLocalStorage<TraceContext>();

const begin = (step: string, source: TraceSource): ((detail: string, kind: TraceKind) => void) => {
  const ctx: TraceContext | undefined = storage.getStore();

  if (!ctx) {
    return (): void => undefined;
  }

  const startedAt: number = performance.now();
  const entry: TraceStep = {
    at: Math.round(startedAt - ctx.start),
    depth: ctx.depth,
    detail: '',
    kind: 'info',
    source,
    step,
  };

  ctx.steps.push(entry);
  ctx.depth += 1;

  return (detail: string, kind: TraceKind): void => {
    ctx.depth -= 1;
    entry.detail = detail;
    entry.kind = kind;
    entry.durationMs = Math.round(performance.now() - startedAt);
  };
};

/** Runs `fn` and returns what it resolved or threw, with the steps and HTTP requests it made. */
export const traced = async <R>(fn: () => Promise<R>): Promise<Traced<R>> => {
  const ctx: TraceContext = {depth: 0, requests: [], start: performance.now(), steps: []};

  return storage.run(ctx, async (): Promise<Traced<R>> => {
    try {
      const value: R = await fn();
      return {ms: Math.round(performance.now() - ctx.start), ok: true, requests: ctx.requests, steps: ctx.steps, value};
    } catch (error: unknown) {
      return {
        error,
        ms: Math.round(performance.now() - ctx.start),
        ok: false,
        requests: ctx.requests,
        steps: ctx.steps,
      };
    }
  });
};

const summarize = (value: unknown): string => {
  if (typeof value === 'boolean') return String(value);
  if (value === undefined || value === null || value === '') return 'nothing';
  if (typeof value === 'string') {
    if (value.startsWith('http')) {
      const url: URL = new URL(value);
      return `${url.host}${url.pathname}`;
    }
    if (/^[\w-]+\.[\w-]+\.[\w-]*$/.test(value)) return `JWT (${value.length} chars)`;
    return `string (${value.length} chars)`;
  }
  if (value instanceof Response) return `Response ${value.status}`;
  if (typeof value === 'object') {
    const keys: string[] = Object.keys(value);
    return `{${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', ...' : ''}}`;
  }
  return typeof value;
};

const errorText = (e: unknown): string => {
  if (!(e instanceof Error)) return String(e);
  const code: unknown = (e as {code?: unknown}).code;
  return typeof code === 'string' ? `${code}: ${e.message}` : e.message;
};

const shortId = (value: unknown): string => (typeof value === 'string' ? `sid=${value.slice(0, 8)}...` : '');

/**
 * Client methods to trace, with the position of their session id argument (-1: none). The
 * protected ones are the steps the public methods are built from.
 */
const CLIENT_METHODS: Record<string, number> = {
  clearSession: 0,
  clearSessionAsync: 0,
  decodeJwtToken: -1,
  exchangeToken: 1,
  getAccessToken: 0,
  getConfiguration: -1,
  getDecodedIdToken: 0,
  getDiscoveryResponse: -1,
  getFlows: 1,
  getIdToken: 0,
  getOBOSignInURL: -1,
  getOpenIDProviderEndpoints: -1,
  getSignInUrl: 1,
  getSignOutUrl: 0,
  getUser: 0,
  getUserTypes: 1,
  getUsers: 1,
  handleBackchannelLogout: -1,
  initiateCIBA: -1,
  isSignedIn: 0,
  loadOpenIDProviderConfiguration: -1,
  management: 0,
  pollCIBA: -1,
  refreshAccessToken: 0,
  requestAccessToken: 2,
  requestAccessTokenRevocation: 0,
  requestClientCredentialsToken: 0,
  revokeAccessToken: 0,
  setSession: 1,
  signIn: 1,
  signOut: 0,
  updateUserCredentials: 1,
  validateLogoutToken: -1,
};

const describeArg = (value: unknown): string => {
  if (typeof value === 'string') return `'${value.length > 12 ? `${value.slice(0, 12)}...` : value}'`;
  if (value && typeof value === 'object') {
    const keys: string[] = Object.entries(value)
      .filter(([, v]: [string, unknown]) => v !== undefined)
      .map(([key]: [string, unknown]) => key);
    return `{${keys.join(', ')}}`;
  }
  return String(value);
};

/**
 * The management client is a plain object of operations, built per call to `management()`, so its
 * operations are wrapped on the object it returns.
 */
const traceManagement = (management: ThunderIDNodeManagementClient): ThunderIDNodeManagementClient =>
  Object.fromEntries(
    Object.entries(management).map(([collection, operations]: [string, Record<string, unknown>]) => [
      collection,
      Object.fromEntries(
        Object.entries(operations).map(([name, operation]: [string, unknown]) => [
          name,
          async (...args: unknown[]): Promise<unknown> => {
            const end: (detail: string, kind: TraceKind) => void = begin(
              `management.${collection}.${name}(${args.map(describeArg).join(', ')})`,
              'client',
            );
            try {
              const result: unknown = await (operation as (...a: unknown[]) => Promise<unknown>)(...args);
              end(`returned ${summarize(result)}`, 'ok');
              return result;
            } catch (e: unknown) {
              end(`threw ${errorText(e)}`, 'error');
              throw e;
            }
          },
        ]),
      ),
    ]),
  ) as unknown as ThunderIDNodeManagementClient;

/**
 * Wraps the client's methods on the instance. Methods the SDK calls through `this` then go through
 * the wrappers too, so the trace shows how one call is built from the others.
 */
export const traceClient = (client: ThunderIDNodeClient, label: string): void => {
  const target: Record<string, unknown> = client as unknown as Record<string, unknown>;

  Object.entries(CLIENT_METHODS).forEach(([name, sessionIndex]: [string, number]): void => {
    const original: unknown = target[name];
    if (typeof original !== 'function') return;

    target[name] = (...args: unknown[]): unknown => {
      const sessionArg: unknown = sessionIndex >= 0 ? args[sessionIndex] : undefined;
      const end: (detail: string, kind: TraceKind) => void = begin(
        `${label}.${name}(${shortId(sessionArg)})`,
        'client',
      );
      const done = (result: unknown): unknown => {
        if (name === 'management') {
          end('returned the management client bound to the session', 'ok');
          return traceManagement(result as ThunderIDNodeManagementClient);
        }
        end(`returned ${summarize(result)}`, result === false ? 'warn' : 'ok');
        return result;
      };
      const fail = (e: unknown): never => {
        end(`threw ${errorText(e)}`, 'error');
        throw e;
      };

      try {
        const result: unknown = (original as (...a: unknown[]) => unknown).apply(client, args);
        return result instanceof Promise ? result.then(done, fail) : done(result);
      } catch (e: unknown) {
        return fail(e);
      }
    };
  });
};

const kindForStatus = (status: number): TraceKind => {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'ok';
};

const SECRET_FIELDS: string[] = ['client_secret', 'password'];
const SECRET_HEADERS: string[] = ['authorization', 'flow-secret'];

const mask = (value: string): string => (value.length > 12 ? `${value.slice(0, 10)}...` : '***');

const maskBody = (body: string): string =>
  SECRET_FIELDS.reduce(
    (masked: string, field: string): string =>
      masked
        .replace(new RegExp(`(^|&)${field}=[^&]*`, 'g'), `$1${field}=***`)
        .replace(new RegExp(`("${field}"\\s*:\\s*)"[^"]*"`, 'g'), '$1"***"'),
    body,
  );

const headerList = (headers: ConstructorParameters<typeof Headers>[0]): [string, string][] =>
  [...new Headers(headers).entries()].map(([name, value]: [string, string]): [string, string] => [
    name,
    SECRET_HEADERS.includes(name) ? mask(value) : value,
  ]);

const describeBody = (body: string | undefined): string => {
  if (!body) return '';
  const grant: string | null = new URLSearchParams(body).get('grant_type');
  return grant ? ` grant_type=${grant}` : '';
};

/** Wraps `fetch` so the SDK's requests to ThunderID appear in the trace and on the HTTP tab. */
export const traceFetch = (): void => {
  const original: typeof fetch = globalThis.fetch;

  globalThis.fetch = async (
    input: string | URL | globalThis.Request,
    init?: RequestInit,
  ): Promise<globalThis.Response> => {
    const ctx: TraceContext | undefined = storage.getStore();
    if (!ctx) return original(input, init);

    const url: URL = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const method: string = init?.method ?? (input instanceof globalThis.Request ? input.method : 'GET');
    const body: string | undefined =
      typeof init?.body === 'string' || init?.body instanceof URLSearchParams ? init.body.toString() : undefined;
    const exchange: HttpExchange = {
      method,
      requestBody: body ? maskBody(body) : undefined,
      requestHeaders: headerList(init?.headers),
      responseHeaders: [],
      url: url.toString(),
    };
    ctx.requests.push(exchange);

    const startedAt: number = performance.now();
    const end: (detail: string, kind: TraceKind) => void = begin(
      `${method} ${url.host}${url.pathname}${describeBody(body)}`,
      'http',
    );

    try {
      const response: globalThis.Response = await original(input, init);
      exchange.status = response.status;
      exchange.statusText = response.statusText;
      exchange.responseHeaders = [...response.headers.entries()];
      exchange.responseBody = await response.clone().text();
      exchange.durationMs = Math.round(performance.now() - startedAt);
      end(`${response.status} ${response.statusText}`, kindForStatus(response.status));
      return response;
    } catch (e: unknown) {
      const cause: unknown = e instanceof Error ? e.cause : undefined;
      exchange.error = cause instanceof Error ? cause.message : String(e);
      exchange.durationMs = Math.round(performance.now() - startedAt);
      end(`failed: ${exchange.error}`, 'error');
      throw e;
    }
  };
};

const LOG_KIND: Record<LogLevel, TraceKind> = {debug: 'info', error: 'error', info: 'info', warn: 'warn'};

/**
 * Routes the SDK logger through its `formatter` hook: every line goes to stdout and, while an
 * operation runs, into its trace.
 */
export const traceSdkLogs = (): void => {
  logger.configure({
    formatter: (level: LogLevel, message: string): void => {
      process.stdout.write(`[ThunderID SDK] ${level.toUpperCase()} ${message}\n`);
      begin('SDK log', 'log')(message, LOG_KIND[level]);
    },
    level: 'debug',
  });
};
