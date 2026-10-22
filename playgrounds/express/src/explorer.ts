// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import type {SessionData, ThunderIDExpressClient, User} from '@thunderid/express';
import express, {type Request, type Response, type Router} from 'express';
import catalog, {type RouteSpec} from './catalog.ts';
import config from './config.ts';
import resolveEndpoints, {type ResolvedEndpoint} from './endpoints.ts';
import {clientOf, sessionOf} from './helpers.ts';
import {newTraceId, takeTrace, TRACE_HEADER, type TraceStep} from './trace.ts';

type Identity = 'anonymous' | 'session' | 'expired';

const SERVER_FILE: URL = new URL('./server.ts', import.meta.url);

const readRegions = (): Map<string, string> => {
  const source: string = readFileSync(SERVER_FILE, 'utf8');
  const regions: Map<string, string> = new Map<string, string>();
  const pattern = /\/\/ #region (\S+)\n([\s\S]*?)\/\/ #endregion/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match) {
    regions.set(match[1], match[2].trimEnd());
    match = pattern.exec(source);
  }
  return regions;
};

const readSdkVersion = (): string => {
  const entry: string = fileURLToPath(import.meta.resolve('@thunderid/express'));
  const manifest: {version: string} = JSON.parse(
    readFileSync(new URL('../package.json', `file://${entry}`), 'utf8'),
  ) as {version: string};
  return manifest.version;
};

/**
 * The session record behind a session id. `@thunderid/node` exposes no public read of it (expiry,
 * refresh token presence), so the playground reaches the client's storage manager directly.
 */
const sessionRecord = (client: ThunderIDExpressClient, sessionId: string): Promise<SessionData | undefined> =>
  (client as unknown as {getStorageManager(): {getSessionData(id: string): Promise<SessionData | undefined>}})
    .getStorageManager()
    .getSessionData(sessionId);

const expiresAt = (data: SessionData | undefined): number | undefined =>
  data?.created_at && data.expires_in ? data.created_at + parseInt(data.expires_in, 10) * 1000 : undefined;

const displayName = (user: User): string => {
  const u: Record<string, unknown> = user as Record<string, unknown>;
  const given: unknown = u['given_name'] ?? u['givenName'];
  const family: unknown = u['family_name'] ?? u['familyName'];
  const named: string = [given, family].filter((part: unknown): part is string => typeof part === 'string').join(' ');
  const candidates: unknown[] = [u['name'], named, u['username'], u['email'], u['sub']];
  const found: unknown = candidates.find((value: unknown): boolean => typeof value === 'string' && value !== '');
  return typeof found === 'string' ? found : 'Signed-in user';
};

const idpStatus = async (): Promise<{error?: string; reachable: boolean}> => {
  try {
    await fetch(`${config.baseUrl}/.well-known/openid-configuration`, {signal: AbortSignal.timeout(1500)});
    return {reachable: true};
  } catch (e: unknown) {
    const cause: unknown = e instanceof Error ? e.cause : undefined;
    return {error: cause instanceof Error ? cause.message : String(e), reachable: false};
  }
};

// One expired copy per real session, rebuilt before every send that uses it.
const expiredCopies: Map<string, string> = new Map<string, string>();

/**
 * Builds the "expired access token" identity: a copy of the caller's session whose access token
 * expired a minute ago. The SDK then sees a real expired session, and the caller's own session is
 * left alone.
 */
const expiredCopyOf = async (client: ThunderIDExpressClient, sessionId: string): Promise<string | undefined> => {
  const data: SessionData | undefined = await sessionRecord(client, sessionId);
  if (!data?.access_token) return undefined;

  const copyId: string = expiredCopies.get(sessionId) ?? randomUUID();
  expiredCopies.set(sessionId, copyId);
  const lifetimeSeconds: number = parseInt(data.expires_in, 10) || 3600;
  await client.setSession({...data, created_at: Date.now() - (lifetimeSeconds + 60) * 1000}, copyId);
  return copyId;
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const buildCurl = (method: string, url: string, headers: Record<string, string>, body?: string): string => {
  const lines: string[] = [`curl -i -X ${method} ${shellQuote(url)}`];
  Object.entries(headers).forEach(([name, value]: [string, string]): void => {
    lines.push(`  -H ${shellQuote(`${name}: ${value}`)}`);
  });
  if (body) lines.push(`  --data ${shellQuote(body)}`);
  return lines.join(' \\\n');
};

const prettyBody = (text: string, contentType: string | null): string => {
  if (!text) return '';
  if (contentType?.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  return text;
};

const waitForTrace = async (id: string): Promise<TraceStep[]> => {
  let steps: TraceStep[] = takeTrace(id);
  for (let attempt = 0; steps.length === 0 && attempt < 10; attempt += 1) {
    await new Promise((resolve: (value: unknown) => void): void => {
      setTimeout(resolve, 10);
    });
    steps = takeTrace(id);
  }
  return steps;
};

/** The API explorer's backend: route catalogue, session state and the request runner. */
const explorer = (): Router => {
  const router: Router = express.Router();
  const regions: Map<string, string> = readRegions();
  const sdkVersion: string = readSdkVersion();

  router.get('/meta', async (req: Request, res: Response) => {
    const client: ThunderIDExpressClient = clientOf(req);
    const sessionId: string | undefined = sessionOf(req);
    let session: Record<string, unknown> = {present: false};

    if (sessionId) {
      const data: SessionData | undefined = await sessionRecord(client, sessionId);
      const signedIn: boolean = await client.isSignedIn(sessionId);
      let name: string | undefined;
      try {
        name = data?.id_token ? displayName(await client.getUser(sessionId)) : undefined;
      } catch {
        name = undefined;
      }
      session = {
        expiresAt: expiresAt(data),
        hasRefreshToken: Boolean(data?.refresh_token),
        hasTokens: Boolean(data?.access_token),
        name,
        present: true,
        scopes: data?.scope?.split(' ') ?? [],
        signedIn,
      };
    }

    // Resolved from the client's own configuration, so the list shows what the SDK will call.
    let endpoints: ResolvedEndpoint[] = [];
    try {
      endpoints = resolveEndpoints(await client.getConfiguration());
    } catch {
      endpoints = resolveEndpoints({baseUrl: config.baseUrl, endpoints: config.endpoints});
    }

    res.json({
      app: config.appUrl,
      configured: Boolean(config.clientId),
      cookieName: client.getSessionCookieName(),
      endpoints,
      idp: {baseUrl: config.baseUrl, ...(await idpStatus())},
      routes: catalog.routes.map((route: RouteSpec) => ({
        ...route,
        source: route.regions.map((name: string): string => regions.get(name) ?? '').join('\n\n'),
      })),
      sdk: {name: '@thunderid/express', version: sdkVersion},
      session,
    });
  });

  router.post('/send', async (req: Request, res: Response) => {
    const {body, identity, params, routeId} = (req.body ?? {}) as {
      body?: string;
      identity?: Identity;
      params?: Record<string, string>;
      routeId?: string;
    };
    const route: RouteSpec | undefined = catalog.routes.find((r: RouteSpec): boolean => r.id === routeId);

    if (!route) {
      res.status(404).json({message: 'Unknown route.'});
      return;
    }

    const client: ThunderIDExpressClient = clientOf(req);
    const ownSession: string | undefined = sessionOf(req);
    let sessionId: string | undefined;

    if (identity === 'session' || identity === 'expired') {
      if (!ownSession) {
        res.status(409).json({message: 'Sign in first: this identity uses your playground session.'});
        return;
      }
      sessionId = identity === 'session' ? ownSession : await expiredCopyOf(client, ownSession);
      if (!sessionId) {
        res.status(409).json({message: 'Your session holds no tokens to expire. Sign in again.'});
        return;
      }
    }

    let path: string = route.path;
    const query: URLSearchParams = new URLSearchParams();
    route.params.forEach((param: {name: string; where: string}): void => {
      const value: string = params?.[param.name] ?? '';
      if (param.where === 'path') path = path.replace(`:${param.name}`, encodeURIComponent(value));
      else if (value) query.set(param.name, value);
    });
    const url = `${config.appUrl}${path}${query.size ? `?${query.toString()}` : ''}`;

    const headers: Record<string, string> = {};
    if (sessionId) headers['Cookie'] = `${client.getSessionCookieName()}=${sessionId}`;
    const sendBody: string | undefined = route.method === 'POST' ? (body ?? route.body ?? '') : undefined;
    if (sendBody !== undefined && route.contentType) headers['Content-Type'] = route.contentType;

    const traceId: string = newTraceId();
    const started: number = performance.now();

    try {
      const response: globalThis.Response = await fetch(url, {
        body: sendBody,
        headers: {...headers, [TRACE_HEADER]: traceId},
        method: route.method,
        redirect: 'manual',
      });
      const text: string = await response.text();
      const ms: number = Math.round(performance.now() - started);

      res.json({
        body: prettyBody(text, response.headers.get('content-type')),
        curl: buildCurl(route.method, url, headers, sendBody),
        headers: [...response.headers.entries()],
        ms,
        size: Buffer.byteLength(text),
        status: response.status,
        statusText: response.statusText,
        trace: await waitForTrace(traceId),
      });
    } catch (e: unknown) {
      res.status(502).json({message: `The request did not complete: ${e instanceof Error ? e.message : String(e)}`});
    }
  });

  return router;
};

export default explorer;
