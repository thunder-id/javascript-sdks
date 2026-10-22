// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Playground-only request tracing. `@thunderid/express` has no debug event stream, so the
 * playground builds the SDK trace from three sources:
 *
 * - the SDK's own logger, through its public `formatter` hook (`logger.configure()`);
 * - wrappers around the middleware and handlers mounted on each route;
 * - wrappers around the client methods those handlers call, and around `fetch`, which the SDK
 *   uses for every request to ThunderID.
 *
 * Each traced request carries an `x-playground-trace` header set by the explorer. Its steps are
 * collected in an `AsyncLocalStorage` context and kept briefly so the explorer can read them.
 */

import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {
  logger,
  type LogLevel,
  type ThunderIDExpressClient,
  type ThunderIDNodeManagementClient,
} from '@thunderid/express';
import type {NextFunction, Request, RequestHandler, Response} from 'express';

export type TraceKind = 'ok' | 'info' | 'warn' | 'error';

export type TraceSource = 'middleware' | 'client' | 'http' | 'log';

export interface TraceStep {
  at: number;
  depth: number;
  detail: string;
  durationMs?: number;
  kind: TraceKind;
  source: TraceSource;
  step: string;
}

interface TraceContext {
  depth: number;
  start: number;
  steps: TraceStep[];
}

export const TRACE_HEADER = 'x-playground-trace';

const KEEP_TRACES = 50;

const storage: AsyncLocalStorage<TraceContext> = new AsyncLocalStorage<TraceContext>();

const finished: Map<string, TraceStep[]> = new Map<string, TraceStep[]>();

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

const record = (step: string, detail: string, kind: TraceKind, source: TraceSource): void => {
  begin(step, source)(detail, kind);
};

const kindForStatus = (status: number): TraceKind => {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'ok';
};

/** Starts a trace for requests sent by the explorer. Mount it before everything else. */
export const traceRequests =
  (): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    const id: string | undefined = req.get(TRACE_HEADER);

    if (!id) {
      next();
      return;
    }

    const ctx: TraceContext = {depth: 0, start: performance.now(), steps: []};

    res.on('finish', (): void => {
      finished.set(id, ctx.steps);
      if (finished.size > KEEP_TRACES) {
        finished.delete(finished.keys().next().value!);
      }
    });

    storage.run(ctx, next);
  };

export const newTraceId = (): string => randomUUID();

/** Returns and forgets the steps recorded for a finished request. */
export const takeTrace = (id: string): TraceStep[] => {
  const steps: TraceStep[] = finished.get(id) ?? [];
  finished.delete(id);
  return steps;
};

/**
 * Wraps a middleware or handler so the trace shows whether it passed the request on or answered
 * it, and with what status.
 */
export const traced =
  (label: string, handler: RequestHandler): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const end: (detail: string, kind: TraceKind) => void = begin(label, 'middleware');
    let passed = false;

    try {
      await handler(req, res, (err?: unknown): void => {
        passed = true;
        if (res.headersSent && !err) {
          end(`responded ${res.statusCode}, then called next()`, kindForStatus(res.statusCode));
          next();
          return;
        }
        end(
          err ? `next(error): ${err instanceof Error ? err.message : 'error'}` : 'passed the request on',
          err ? 'error' : 'ok',
        );
        next(err);
      });
    } catch (e: unknown) {
      end(`threw: ${e instanceof Error ? e.message : String(e)}`, 'error');
      throw e;
    }

    if (!passed) {
      // Some handlers (handleBackchannelLogout()) answer from a callback after they return.
      if (!res.writableEnded) {
        await new Promise<void>((resolve: () => void): void => {
          res.once('finish', resolve);
          res.once('close', resolve);
        });
      }
      const location: string | undefined = res.get('location');
      const status: number = res.statusCode;
      end(location ? `responded ${status}, location ${location}` : `responded ${status}`, kindForStatus(status));
    }
  };

/** Route-layer shape of Express 5's router, enough to wrap each handler in place. */
interface RouterLayer {
  handle: RequestHandler;
  route?: {methods: Record<string, boolean>; path: string; stack: RouterLayer[]};
}

/**
 * Wraps the handlers of every route registered on `app` with {@link traced}, labelling them from
 * `chains` (keyed by `METHOD path`), so route definitions stay free of tracing code.
 */
export const traceRoutes = (router: {stack: RouterLayer[]}, chains: Map<string, string[]>): void => {
  router.stack.forEach((layer: RouterLayer): void => {
    if (!layer.route) return;
    const method: string = Object.keys(layer.route.methods)[0]?.toUpperCase() ?? 'GET';
    const labels: string[] = chains.get(`${method} ${layer.route.path}`) ?? [];
    layer.route.stack.forEach((routeLayer: RouterLayer, index: number): void => {
      routeLayer.handle = traced(labels[index] ?? 'handler', routeLayer.handle);
    });
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
    return `string (${value.length} chars)`;
  }
  if (typeof value === 'object') {
    const keys: string[] = Object.keys(value);
    return `{${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', ...' : ''}}`;
  }
  return typeof value;
};

const shortId = (value: unknown): string => (typeof value === 'string' ? `sid=${value.slice(0, 8)}...` : '');

// Client methods to trace, with the position of their session id argument (-1: none).
const CLIENT_METHODS: Record<string, number> = {
  decodeJwtToken: -1,
  getAccessToken: 0,
  getDecodedIdToken: 0,
  getIdToken: 0,
  getSignInUrl: 1,
  getUser: 0,
  getUsers: 1,
  handleBackchannelLogout: -1,
  isSignedIn: 0,
  refreshAccessToken: 0,
  signOut: 0,
};

const instrumented: WeakSet<object> = new WeakSet<object>();

const describeArg = (value: unknown): string => {
  if (typeof value === 'string') return `'${value.length > 12 ? `${value.slice(0, 12)}...` : value}'`;
  if (value && typeof value === 'object') return `{${Object.keys(value).join(', ')}}`;
  return String(value);
};

/**
 * The management client is a plain object of operations, built per call to
 * managementFromRequest(), so its operations are wrapped on the object it returns.
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
              const code: unknown = (e as {code?: unknown}).code;
              end(
                `threw ${typeof code === 'string' ? `${code}: ` : ''}${e instanceof Error ? e.message : String(e)}`,
                'error',
              );
              throw e;
            }
          },
        ]),
      ),
    ]),
  ) as unknown as ThunderIDNodeManagementClient;

/** Wraps the client's public methods on the instance so nested SDK calls show up in the trace. */
const traceClient = (client: ThunderIDExpressClient): void => {
  if (instrumented.has(client)) return;
  instrumented.add(client);

  const target: Record<string, unknown> = client as unknown as Record<string, unknown>;

  Object.entries(CLIENT_METHODS).forEach(([name, sessionIndex]: [string, number]): void => {
    const original: unknown = target[name];
    if (typeof original !== 'function') return;

    target[name] = async (...args: unknown[]): Promise<unknown> => {
      const sessionArg: unknown = sessionIndex >= 0 ? args[sessionIndex] : undefined;
      const end: (detail: string, kind: TraceKind) => void = begin(`client.${name}(${shortId(sessionArg)})`, 'client');
      try {
        const result: unknown = await (original as (...a: unknown[]) => Promise<unknown>).apply(client, args);
        end(`returned ${summarize(result)}`, result === false ? 'warn' : 'ok');
        return result;
      } catch (e: unknown) {
        end(`threw ${e instanceof Error ? e.message : String(e)}`, 'error');
        throw e;
      }
    };
  });

  // managementFromRequest() is synchronous (it throws when there is no session cookie), so it is
  // wrapped without the async wrapper above.
  const managementFromRequest: unknown = target['managementFromRequest'];
  if (typeof managementFromRequest === 'function') {
    target['managementFromRequest'] = (...args: unknown[]): ThunderIDNodeManagementClient => {
      const end: (detail: string, kind: TraceKind) => void = begin('client.managementFromRequest(req)', 'client');
      try {
        const management: ThunderIDNodeManagementClient = (
          managementFromRequest as (...a: unknown[]) => ThunderIDNodeManagementClient
        ).apply(client, args);
        end('returned the management client bound to the session cookie', 'ok');
        return traceManagement(management);
      } catch (e: unknown) {
        end(`threw ${e instanceof Error ? e.message : String(e)}`, 'error');
        throw e;
      }
    };
  }
};

/**
 * Mount right after `thunderID()`: instruments the client it attached and notes the step in the
 * trace (an app-level middleware is not wrapped by {@link traceRoutes}).
 */
export const traceSdkClient =
  (): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const client: ThunderIDExpressClient | undefined = (req as Request & {thunderIDAuth?: ThunderIDExpressClient})
      .thunderIDAuth;
    if (client) traceClient(client);
    record(
      'thunderID()',
      client ? 'initialised the client and attached it to req.thunderIDAuth' : 'no client attached',
      client ? 'ok' : 'error',
      'middleware',
    );
    next();
  };

const describeBody = (body: unknown): string => {
  if (typeof body !== 'string') return '';
  const grant: string | null = new URLSearchParams(body).get('grant_type');
  return grant ? ` grant_type=${grant}` : '';
};

/** Wraps `fetch` so the SDK's requests to ThunderID appear in the trace. */
export const traceFetch = (): void => {
  const original: typeof fetch = globalThis.fetch;

  globalThis.fetch = async (
    input: string | URL | globalThis.Request,
    init?: RequestInit,
  ): Promise<globalThis.Response> => {
    if (!storage.getStore()) return original(input, init);

    const url: URL = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const method: string = init?.method ?? (input instanceof globalThis.Request ? input.method : 'GET');
    const end: (detail: string, kind: TraceKind) => void = begin(
      `${method} ${url.host}${url.pathname}${describeBody(init?.body)}`,
      'http',
    );

    try {
      const response: globalThis.Response = await original(input, init);
      end(`${response.status} ${response.statusText}`, kindForStatus(response.status));
      return response;
    } catch (e: unknown) {
      const cause: unknown = e instanceof Error ? e.cause : undefined;
      end(`failed: ${cause instanceof Error ? cause.message : String(e)}`, 'error');
      throw e;
    }
  };
};

const LOG_KIND: Record<LogLevel, TraceKind> = {debug: 'info', error: 'error', info: 'info', warn: 'warn'};

/**
 * Routes the SDK logger through its `formatter` hook: every line goes to stdout and, for a traced
 * request, into its trace.
 */
export const traceSdkLogs = (): void => {
  logger.configure({
    formatter: (level: LogLevel, message: string): void => {
      process.stdout.write(`[ThunderID SDK] ${level.toUpperCase()} ${message}\n`);
      record('SDK log', message, LOG_KIND[level], 'log');
    },
    level: 'debug',
  });
};
