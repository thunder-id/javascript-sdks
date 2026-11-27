// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  BffAdapter,
  BffConstants,
  BffOptions,
  BffSession,
  BffSwitchResult,
  ExtendedAuthorizeRequestUrlParams,
  OrganizationUnitSwitchErrorCodes,
  bffRedirect,
  bffSignedIn,
  generateSessionId,
  getRequestOrigins,
  handleBffRequest,
  logger,
  toSafeReturnTo,
} from '@thunderid/node';
import {decodeJwt} from 'jose';
import signOutAction from './actions/auth/signOutAction';
import switchOrganizationUnitAction, {
  SwitchOrganizationUnitActionResult,
} from './actions/auth/switchOrganizationUnitAction';
import backchannelLogout from './backchannelLogout';
import getClient from './getClient';
import {ThunderIDNextConfig} from '../models/config';
import {deleteChunkedCookie, getChunkedCookie, setChunkedCookie, toCookieDeletion} from '../utils/chunkedCookie';
import handleRefreshToken, {HandleRefreshTokenResult} from '../utils/handleRefreshToken';
import SessionManager, {SessionTokenPayload} from '../utils/SessionManager';
import setSessionCookie from '../utils/setSessionCookie';

type RequestCookies = Awaited<ReturnType<typeof import('next/headers').cookies>>;

/**
 * Reads the request's cookie store. `next/headers` is imported lazily because the package root re-exports this
 * module, and a static import of `next/headers` fails a build that reaches the root from a Client Component.
 */
const cookies = async (): Promise<RequestCookies> => (await import('next/headers')).cookies();

/**
 * How the Next.js BFF is set up. Every field is optional.
 */
export interface ThunderIDBffOptions extends BffOptions {
  /**
   * The API the proxy forwards to. Defaults to the ThunderID `baseUrl`, so the SDK's components that
   * call ThunderID's own APIs, such as the user profile, work through the proxy.
   */
  apiBaseUrl?: string;
}

const getConfig = async (): Promise<ThunderIDNextConfig> => {
  const client = getClient();

  if (!client.isInitialized) {
    await client.initialize({} as ThunderIDNextConfig);
  }

  return client.getConfiguration();
};

const toScope = (scopes: unknown): string | undefined =>
  Array.isArray(scopes) ? scopes.join(' ') : typeof scopes === 'string' ? scopes : undefined;

/** The ID token's claims, or only `sub` when the session holds no ID token. */
const toClaims = (payload: SessionTokenPayload): Record<string, unknown> => {
  if (payload.idToken) {
    try {
      return decodeJwt(payload.idToken) as Record<string, unknown>;
    } catch {
      logger.warn('[bff] The session holds an ID token that cannot be decoded.');
    }
  }

  return {sub: payload.sub};
};

const readCookie = (cookieStore: RequestCookies): string | undefined =>
  getChunkedCookie(cookieStore, SessionManager.getSessionCookieName());

const clearSessionCookie = (cookieStore: RequestCookies): void => {
  deleteChunkedCookie(cookieStore, SessionManager.getSessionCookieName(), SessionManager.getSessionCookieOptions(0));
};

/**
 * Refreshes the session in the cookie, and writes the new one. Clears the cookie when it cannot.
 *
 * @returns The refreshed session, or `null` when there is none to refresh or the refresh failed.
 */
const refreshSession = async (cookieStore: RequestCookies): Promise<SessionTokenPayload | null> => {
  const token: string | undefined = readCookie(cookieStore);

  if (!token) {
    return null;
  }

  try {
    const config: ThunderIDNextConfig = await getConfig();
    const result: HandleRefreshTokenResult = await handleRefreshToken(
      await SessionManager.verifySessionTokenForRefresh(token),
      {
        baseUrl: config.baseUrl ?? '',
        clientId: config.clientId ?? '',
        clientSecret: config.clientSecret ?? '',
        sessionCookie: config.sessionCookie,
      },
    );

    setChunkedCookie(
      cookieStore,
      SessionManager.getSessionCookieName(),
      result.newSessionToken,
      SessionManager.getSessionCookieOptions(result.sessionCookieExpiryTime),
    );

    return await SessionManager.verifySessionToken(result.newSessionToken);
  } catch {
    clearSessionCookie(cookieStore);

    return null;
  }
};

const switchErrorFor = (result: Extract<SwitchOrganizationUnitActionResult, {success: false}>): BffSwitchResult => {
  if (result.statusCode === 401) {
    return {error: BffConstants.Errors.LOGIN_REQUIRED, status: 401};
  }

  switch (result.code) {
    case OrganizationUnitSwitchErrorCodes.InteractionRequired:
      return {error: 'interaction_required'};
    case OrganizationUnitSwitchErrorCodes.UnauthorizedClient:
      return {error: 'unauthorized_client'};
    case OrganizationUnitSwitchErrorCodes.InvalidOrganizationUnit:
      return {error: BffConstants.Errors.INVALID_REQUEST};
    default:
      return {error: BffConstants.Errors.SERVER_ERROR, status: 502};
  }
};

const adapter: BffAdapter = {
  async backchannelLogout(request: Request): Promise<Response> {
    return backchannelLogout().POST(request);
  },

  async callback(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const cookieStore: RequestCookies = await cookies();
    const tempToken: string | undefined = cookieStore.get(SessionManager.getTempSessionCookieName())?.value;
    const code: string | null = url.searchParams.get('code');
    const state: string | null = url.searchParams.get('state');
    let temp: {returnTo?: string; sessionId: string} | undefined;

    try {
      temp = tempToken ? await SessionManager.verifyTempSession(tempToken) : undefined;
    } catch {
      temp = undefined;
    }

    cookieStore.delete(
      toCookieDeletion(SessionManager.getTempSessionCookieName(), SessionManager.getTempSessionCookieOptions()),
    );

    if (!temp || !code || !state || url.searchParams.has('error')) {
      logger.warn(`[bff] Sign-in did not complete: ${url.searchParams.get('error') ?? 'no sign-in in progress'}.`);

      return bffRedirect('/');
    }

    const client = getClient();
    const config: ThunderIDNextConfig = await getConfig();
    const tokens: Record<string, unknown> = (await client.signIn({code, state}, {}, temp.sessionId)) as Record<
      string,
      unknown
    >;

    await setSessionCookie(client, cookieStore, temp.sessionId, tokens, config);

    return bffSignedIn(toSafeReturnTo(temp.returnTo), SessionManager.getSessionCookieOptions(0).sameSite);
  },

  async getSession(): Promise<BffSession | null> {
    const cookieStore: RequestCookies = await cookies();
    const token: string | undefined = readCookie(cookieStore);

    if (!token) {
      return null;
    }

    let payload: SessionTokenPayload | null;

    try {
      payload = await SessionManager.verifySessionToken(token);
    } catch {
      // The access token expired, or the session ended: a refresh tells which.
      payload = await refreshSession(cookieStore);
    }

    return payload
      ? {
          accessToken: payload.accessToken,
          expiresAt: payload.exp,
          idTokenClaims: toClaims(payload),
          scope: toScope(payload.scopes),
        }
      : null;
  },

  async isSessionLive(): Promise<boolean> {
    const token: string | undefined = readCookie(await cookies());

    if (!token) {
      return false;
    }

    try {
      // Decrypts and refuses a session a back-channel logout ended, without refreshing anything.
      const payload: SessionTokenPayload = await SessionManager.verifySessionTokenForRefresh(token);

      return Boolean(payload.refreshToken) || payload.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  },

  async refresh(): Promise<boolean> {
    return Boolean(await refreshSession(await cookies()));
  },

  async signIn(_request: Request, {ouId, returnTo}: {ouId?: string; returnTo: string}): Promise<Response> {
    const cookieStore: RequestCookies = await cookies();
    const token: string | undefined = readCookie(cookieStore);
    let sessionId: string | undefined;

    if (token) {
      try {
        sessionId = (await SessionManager.verifySessionToken(token)).sessionId;
      } catch {
        sessionId = undefined;
      }
    }

    if (sessionId && !ouId) {
      return bffRedirect(returnTo);
    }

    sessionId ??= generateSessionId();

    const url: string = await getClient().getAuthorizeRequestUrl(
      (ouId ? {organizationUnitId: ouId} : {}) as ExtendedAuthorizeRequestUrlParams,
      sessionId,
    );

    cookieStore.set(
      SessionManager.getTempSessionCookieName(),
      await SessionManager.createTempSession(sessionId, returnTo),
      SessionManager.getTempSessionCookieOptions(),
    );

    return bffRedirect(url);
  },

  async signOut(): Promise<{redirectUrl: string}> {
    const result: Awaited<ReturnType<typeof signOutAction>> = await signOutAction();

    return {redirectUrl: result.data?.signOutUrl ?? '/'};
  },

  async switchOrganizationUnit(_request: Request, ouId: string): Promise<BffSwitchResult> {
    const result: SwitchOrganizationUnitActionResult = await switchOrganizationUnitAction(ouId, {redirect: false});

    return result.success ? {ok: true} : switchErrorFor(result);
  },
};

/**
 * Serves the BFF contract of RFC 10017 from Next.js, so a React or Vue app in `backend` mode, or the
 * app's own client components, can use this app as its BFF. Add a catch-all route handler:
 *
 * ```ts
 * // app/api/auth/[...thunderid]/route.ts
 * import {thunderIDBff} from '@thunderid/nextjs/server';
 *
 * export const {GET, POST} = thunderIDBff();
 * ```
 *
 * It serves, under `/api/auth`: `GET signin`, `GET callback`, `GET session`, `GET checksession`,
 * `POST refresh`, `POST signout`, `POST switch`, `POST backchannel-logout` and the API proxy under
 * `proxy/`. Every call the browser SDK makes must carry `X-Requested-With: XMLHttpRequest`, and no
 * response carries a token. To complete sign-in through it, set `afterSignInUrl` to the `callback`
 * endpoint on the app's origin and register that URL with the application.
 *
 * The session stays in the encrypted session cookie.
 *
 * @param options - The prefix, the API to proxy to, and the allowed origins.
 * @returns The route handlers.
 */
const thunderIDBff = (
  options: ThunderIDBffOptions = {},
): {
  DELETE: (request: Request) => Promise<Response>;
  GET: (request: Request) => Promise<Response>;
  PATCH: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
  PUT: (request: Request) => Promise<Response>;
} => {
  const prefix: string = (options.prefix ?? BffConstants.DEFAULT_PREFIX).replace(/\/+$/, '');
  let checkedCallback = false;

  const handle = async (request: Request): Promise<Response> => {
    const config: ThunderIDNextConfig = await getConfig();
    const appOrigin: string = new URL(request.url).origin;

    if (!checkedCallback && config.afterSignInUrl) {
      checkedCallback = true;
      if (new URL(config.afterSignInUrl, appOrigin).pathname !== `${prefix}${BffConstants.Endpoints.CALLBACK}`) {
        logger.warn(
          `[bff] afterSignInUrl is not ${prefix}${BffConstants.Endpoints.CALLBACK}, so sign-in started at ` +
            `${prefix}${BffConstants.Endpoints.SIGN_IN} returns to the app instead of completing here.`,
        );
      }
    }

    const response: Response | undefined = await handleBffRequest(request, adapter, {
      ...options,
      prefix,
      allowedOrigins: options.allowedOrigins ?? getRequestOrigins(request),
      apiBaseUrl: options.apiBaseUrl ?? config.baseUrl,
    });

    return response ?? new Response(null, {status: 404});
  };

  return {DELETE: handle, GET: handle, PATCH: handle, POST: handle, PUT: handle};
};

export default thunderIDBff;
