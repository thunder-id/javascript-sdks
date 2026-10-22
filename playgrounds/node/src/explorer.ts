// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {generateSessionId, type SessionData, type User} from '@thunderid/node';
import operations, {type OperationSpec} from './catalog.ts';
import {client, serviceClient} from './client.ts';
import config from './config.ts';
import resolveEndpoints from './endpoints.ts';
import runners, {type Runner} from './operations.ts';
import {traced, type Traced} from './trace.ts';

export type Identity = 'anonymous' | 'session' | 'expired';

const SOURCE_FILES: string[] = ['./client.ts', './operations.ts', './server.ts'];

interface Region {
  code: string;
  file: string;
}

const readRegions = (): Map<string, Region> => {
  const regions: Map<string, Region> = new Map<string, Region>();
  const pattern = /\/\/ #region (\S+)\n([\s\S]*?)\/\/ #endregion/g;
  SOURCE_FILES.forEach((file: string): void => {
    const source: string = readFileSync(new URL(file, import.meta.url), 'utf8');
    let match: RegExpExecArray | null = pattern.exec(source);
    while (match) {
      regions.set(match[1], {code: match[2].trimEnd(), file: `src/${file.slice(2)}`});
      match = pattern.exec(source);
    }
  });
  return regions;
};

const readSdkVersion = (): string => {
  const entry: string = fileURLToPath(import.meta.resolve('@thunderid/node'));
  const manifest: {version: string} = JSON.parse(
    readFileSync(new URL('../package.json', `file://${entry}`), 'utf8'),
  ) as {version: string};
  return manifest.version;
};

/**
 * The session record behind a session id. `@thunderid/node` exposes no public read of it (expiry,
 * refresh token presence), so the playground reaches the client's storage manager directly.
 */
const sessionRecord = (sessionId: string): Promise<SessionData | undefined> =>
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

// One expired copy per real session, rebuilt before every run that uses it.
const expiredCopies: Map<string, string> = new Map<string, string>();

/**
 * Builds the "expired access token" identity: a copy of the browser session whose access token
 * expired a minute ago. The SDK then sees a real expired session, and the browser session is left
 * alone.
 */
const expiredCopyOf = async (sessionId: string): Promise<string | undefined> => {
  const data: SessionData | undefined = await sessionRecord(sessionId);
  if (!data?.access_token) return undefined;

  const copyId: string = expiredCopies.get(sessionId) ?? randomUUID();
  expiredCopies.set(sessionId, copyId);
  const lifetimeSeconds: number = parseInt(data.expires_in, 10) || 3600;
  await client.setSession({...data, created_at: Date.now() - (lifetimeSeconds + 60) * 1000}, copyId);
  return copyId;
};

/** The session summary the explorer shows in its top bar and "Run as" choices. */
export const sessionSummary = async (sessionId: string | undefined): Promise<Record<string, unknown>> => {
  if (!sessionId) return {present: false};
  const data: SessionData | undefined = await sessionRecord(sessionId);
  const signedIn: boolean = data?.access_token ? await client.isSignedIn(sessionId) : false;
  let name: string | undefined;
  try {
    name = data?.id_token ? displayName(await client.getUser(sessionId)) : undefined;
  } catch {
    name = undefined;
  }
  return {
    expiresAt: expiresAt(data),
    hasRefreshToken: Boolean(data?.refresh_token),
    hasTokens: Boolean(data?.access_token),
    id: `${sessionId.slice(0, 8)}...`,
    name,
    present: true,
    scopes: data?.scope?.split(' ') ?? [],
    signedIn,
  };
};

const toJson = (value: unknown): unknown => {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value, (_key: string, v: unknown) => (typeof v === 'bigint' ? String(v) : v)));
};

/** An error as the explorer shows it: SDK errors carry a code, and some carry a server response. */
const describeError = (error: unknown): Record<string, unknown> => {
  if (!(error instanceof Error)) return {message: String(error)};
  const own: Record<string, unknown> = Object.fromEntries(
    Object.entries(error).filter(([key]: [string, unknown]): boolean => key !== 'stack'),
  );
  return toJson({
    ...own,
    message: error.message,
    name: error.name,
    ...(error.cause ? {cause: error.cause instanceof Error ? error.cause.message : error.cause} : {}),
  }) as Record<string, unknown>;
};

const literal = (value: string, type: string): string =>
  type === 'number' && value !== '' && !Number.isNaN(Number(value)) ? value : JSON.stringify(value);

/** The call as code, with the values that were sent, for "Copy as code". */
const callAsCode = (
  operation: OperationSpec,
  params: Record<string, string>,
  args: unknown,
  sessionLabel: string,
): string => {
  const lines: string[] = [];
  if (args !== undefined) lines.push(`const args = ${JSON.stringify(args, null, 2)};`);
  operation.params.forEach((p: {name: string; type: string}): void => {
    lines.push(`const ${p.name} = ${literal(params[p.name] ?? '', p.type)};`);
  });
  if (operation.session) lines.push(`const sessionId = '${sessionLabel}';`);
  const call: string = operation.call.replace(/\((requestConfig|options|config|payload)\b/, '(args');
  lines.push('', `const result = await ${call};`);
  return lines.join('\n');
};

export interface RunRequest {
  args?: string;
  identity?: Identity;
  operationId?: string;
  params?: Record<string, string>;
}

export interface RunResult {
  code: string;
  error?: Record<string, unknown>;
  ms: number;
  ok: boolean;
  requests: Traced<unknown>['requests'];
  session: string;
  steps: Traced<unknown>['steps'];
  value?: unknown;
}

/** The operations explorer's backend: the operation catalogue, session state and the runner. */
const explorer = (): {
  meta: (browserSession: string | undefined) => Promise<Record<string, unknown>>;
  run: (request: RunRequest, browserSession: string | undefined) => Promise<{body: unknown; status: number}>;
} => {
  const regions: Map<string, Region> = readRegions();
  const sdkVersion: string = readSdkVersion();

  const meta = async (browserSession: string | undefined): Promise<Record<string, unknown>> => ({
    app: config.appUrl,
    configured: Boolean(config.clientId),
    // Resolved from the client's own configuration, so the list shows what the SDK will call.
    endpoints: resolveEndpoints(await client.getConfiguration()),
    idp: {baseUrl: config.baseUrl, ...(await idpStatus())},
    operations: operations.map((operation: OperationSpec) => {
      const blocks: Region[] = operation.regions
        .map((name: string): Region | undefined => regions.get(name))
        .filter((region: Region | undefined): region is Region => region !== undefined);
      const sourceFile: string = regions.get(operation.id)?.file ?? '';
      return {
        ...operation,
        source: blocks
          .map((region: Region): string =>
            region.file === sourceFile ? region.code : `// ${region.file}\n${region.code}`,
          )
          .join('\n\n'),
        sourceFile,
      };
    }),
    sdk: {name: '@thunderid/node', version: sdkVersion},
    session: await sessionSummary(browserSession),
  });

  const run = async (
    request: RunRequest,
    browserSession: string | undefined,
  ): Promise<{body: unknown; status: number}> => {
    const operation: OperationSpec | undefined = operations.find(
      (o: OperationSpec): boolean => o.id === request.operationId,
    );
    const runner: Runner | undefined = operation ? runners[operation.id] : undefined;

    if (!operation || !runner) {
      return {body: {message: operation?.unavailable ?? 'Unknown operation.'}, status: 404};
    }

    let args: unknown;
    if (operation.args !== undefined) {
      try {
        args = JSON.parse(request.args ?? operation.args);
      } catch (e: unknown) {
        return {body: {message: `The arguments are not valid JSON: ${(e as Error).message}`}, status: 400};
      }
    }

    let sessionId: string = generateSessionId();
    let sessionLabel = 'a new session id';
    if (request.identity === 'session' || request.identity === 'expired') {
      if (!browserSession) {
        return {body: {message: 'Reload the page: your browser has no playground session yet.'}, status: 409};
      }
      sessionId = browserSession;
      sessionLabel = 'your browser session';
      if (request.identity === 'expired') {
        const copy: string | undefined = await expiredCopyOf(browserSession);
        if (!copy) return {body: {message: 'Your session holds no tokens to expire. Sign in first.'}, status: 409};
        sessionId = copy;
        sessionLabel = 'a copy of your session, access token expired';
      }
    }

    const params: Record<string, string> = request.params ?? {};
    const result: Traced<unknown> = await traced(() => runner({args, client, params, serviceClient, sessionId}));
    const body: RunResult = {
      code: callAsCode(operation, params, args, operation.session ? `${sessionId.slice(0, 8)}...` : ''),
      ms: result.ms,
      ok: result.ok,
      requests: result.requests,
      session: operation.session ? `${sessionLabel} (${sessionId.slice(0, 8)}...)` : 'none',
      steps: result.steps,
      ...(result.ok ? {value: toJson(result.value)} : {error: describeError(result.error)}),
    };
    return {body, status: 200};
  };

  return {meta, run};
};

export default explorer;
