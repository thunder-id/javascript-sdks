// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import type {ReadableStream as NodeReadableStream} from 'node:stream/web';
import {
  BffAdapter,
  BffConstants,
  BffOptions,
  BffSession,
  BffSwitchResult,
  CookieConfig as NodeCookieConfig,
  DeviceSecretSwitchResult,
  ExtendedAuthorizeRequestUrlParams,
  IdToken,
  SessionData,
  bffRedirect,
  bffSignedIn,
  getVendorPrefix,
  handleBffRequest,
  logger as Logger,
  toSafeReturnTo,
} from '@thunderid/node';
import express from 'express';
import {v4 as uuidv4} from 'uuid';
import handleBackchannelLogout from './backchannelLogout';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

/** How long sign-in may take before the place to return to is forgotten, in milliseconds. */
const RETURN_TO_MAX_AGE = 10 * 60 * 1000;

type RequestWithClient = express.Request & {thunderIDAuth?: ThunderIDExpressClient};

/**
 * How the Express BFF is set up. Every field is optional.
 */
export interface ThunderIDBffOptions extends BffOptions {
  /**
   * The API the proxy forwards to. Defaults to the ThunderID `baseUrl`, so the SDK's components that
   * call ThunderID's own APIs, such as the user profile, work through the proxy.
   */
  apiBaseUrl?: string;
  /**
   * The origins a state-changing request may come from. Defaults to the origin of `afterSignInUrl`,
   * which is the app's origin.
   */
  allowedOrigins?: string[];
}

/**
 * Encodes fields a body parser already read back as a form. Nested objects and arrays use the bracket notation
 * that `express.urlencoded({extended: true})` reads, so the API receives the fields the browser sent.
 */
const toFormBody = (fields: Record<string, unknown>): string => {
  const form = new URLSearchParams();

  const append = (name: string, value: unknown, nested: boolean): void => {
    if (Array.isArray(value)) {
      // A top-level array came from a repeated field, which both parsers read back as an array. A nested one needs
      // its index, which only the extended parser produces.
      value.forEach((item: unknown, index: number) =>
        append(nested || (item !== null && typeof item === 'object') ? `${name}[${index}]` : name, item, nested),
      );
    } else if (value !== null && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]: [string, unknown]) => append(`${name}[${key}]`, item, true));
    } else {
      form.append(name, value === undefined || value === null ? '' : String(value as string | number | boolean));
    }
  };

  Object.entries(fields).forEach(([name, value]: [string, unknown]) => append(name, value, false));

  return form.toString();
};

const toWebRequest = (req: express.Request): Request => {
  const url = `${req.protocol}://${req.get('host') ?? 'localhost'}${req.originalUrl}`;
  const headers = new Headers();

  Object.entries(req.headers).forEach(([name, value]: [string, string | string[] | undefined]) => {
    if (Array.isArray(value)) {
      value.forEach((item: string) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  });

  if (['GET', 'HEAD'].includes(req.method)) {
    return new Request(url, {headers, method: req.method});
  }

  // A body parser mounted earlier may have read the body already.
  const parsed: unknown = req.body;
  let body: RequestInit['body'];

  if (Buffer.isBuffer(parsed)) {
    body = new Uint8Array(parsed);
  } else if (typeof parsed === 'string') {
    body = parsed;
  } else if (parsed !== undefined && parsed !== null && typeof parsed === 'object' && req.readableEnded) {
    // Re-encode in the request's own media type, so the API reads the fields the browser sent.
    body = req.is('application/x-www-form-urlencoded')
      ? toFormBody(parsed as Record<string, unknown>)
      : JSON.stringify(parsed);
  } else if (!req.readableEnded) {
    body = Readable.toWeb(req) as unknown as RequestInit['body'];
  }

  return new Request(url, {body, duplex: 'half', headers, method: req.method} as RequestInit);
};

const sendWebResponse = async (response: Response, res: express.Response): Promise<void> => {
  res.status(response.status);
  response.headers.forEach((value: string, name: string) => {
    res.setHeader(name, value);
  });

  if (!response.body) {
    res.end();

    return;
  }

  // Sends the status and headers now, so the browser does not wait for the first chunk.
  res.flushHeaders();

  // Streamed, so an event stream from the API reaches the browser as it arrives. `pipeline` applies
  // backpressure and cancels the upstream body if the browser goes away.
  await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream), res);
};

const createAdapter = (client: ThunderIDExpressClient, req: express.Request, res: express.Response): BffAdapter => {
  const cookies = (): Record<string, string | undefined> =>
    (req.cookies as Record<string, string | undefined> | undefined) ?? {};
  const sessionIdOf = (): string | undefined => cookies()[client.getSessionCookieName()];
  const {secure} = client.getSessionCookieOptions();
  const returnToCookie: string = NodeCookieConfig.withHostPrefix(
    `${getVendorPrefix(client.expressConfig?.vendor)}-return-to`,
    secure,
  );
  const returnToAttributes: express.CookieOptions = {httpOnly: true, path: '/', sameSite: 'lax', secure};

  const readSession = async (sessionId: string): Promise<BffSession | null> => {
    const data: SessionData | undefined = await client.getSessionData(sessionId);

    if (!data) {
      return null;
    }

    const claims: IdToken = await client.getDecodedIdToken(sessionId);

    return {
      accessToken: data.access_token,
      expiresAt: Math.floor((data.created_at + Number(data.expires_in) * 1000) / 1000),
      idTokenClaims: claims as Record<string, unknown>,
      scope: data.scope,
    };
  };

  return {
    async callback(): Promise<Response> {
      const returnTo: string = toSafeReturnTo(cookies()[returnToCookie]);

      res.clearCookie(returnToCookie, returnToAttributes);

      const error: unknown = req.query['error'];

      if (error || !cookies()[client.getSessionStateCookieName()]) {
        Logger.warn(`Sign-in did not complete: ${typeof error === 'string' ? error : 'no sign-in in progress'}.`);
        client.clearSessionStateCookie(res);

        return bffRedirect('/');
      }

      // Checks the state, exchanges the code, then sets the session cookie and clears the sign-in cookie.
      await client.signIn(req, res);

      return bffSignedIn(returnTo, client.getSessionCookieOptions().sameSite as string);
    },

    async getSession(): Promise<BffSession | null> {
      const sessionId: string | undefined = sessionIdOf();

      // Refreshes an expired access token, and forgets a session that cannot be refreshed.
      return sessionId && (await client.isSignedIn(sessionId)) ? readSession(sessionId) : null;
    },

    async isSessionLive(): Promise<boolean> {
      const sessionId: string | undefined = sessionIdOf();

      if (!sessionId) {
        return false;
      }

      // Only looks: a back-channel logout removes the session, and nothing here refreshes it.
      return Boolean(await client.getSessionData(sessionId));
    },

    async refresh(): Promise<boolean> {
      const sessionId: string | undefined = sessionIdOf();

      if (!sessionId) {
        return false;
      }

      try {
        await client.refreshAccessToken(sessionId);

        return true;
      } catch {
        // The contract ends the session when a refresh fails, so `checksession` agrees with the `401`.
        client.clearSessionCookie(res);
        // A failed deletion is not hidden: the session would otherwise outlive the 401.
        await client.endSession(sessionId);

        return false;
      }
    },

    async signIn(_request: Request, {ouId, returnTo}: {ouId?: string; returnTo: string}): Promise<Response> {
      let sessionId: string | undefined = sessionIdOf();

      if (sessionId && !ouId && (await client.isSignedIn(sessionId))) {
        return bffRedirect(returnTo);
      }

      sessionId ??= uuidv4();

      const signInConfig: ExtendedAuthorizeRequestUrlParams = {
        ...client.expressConfig?.signInOptions,
        ...(ouId ? {organizationUnitId: ouId} : {}),
      } as ExtendedAuthorizeRequestUrlParams;
      const url: string = await client.getSignInUrl(signInConfig, sessionId);

      // The session cookie is set at the callback, once sign-in completes.
      res.cookie(client.getSessionStateCookieName(), sessionId, client.getSessionStateCookieOptions());
      res.cookie(returnToCookie, returnTo, {...returnToAttributes, maxAge: RETURN_TO_MAX_AGE});

      return bffRedirect(url);
    },

    async signOut(): Promise<{redirectUrl: string}> {
      const sessionId: string | undefined = sessionIdOf();
      const fallback: string = client.expressConfig?.afterSignOutUrl ?? '/';

      client.clearSessionCookie(res);

      if (!sessionId) {
        return {redirectUrl: fallback};
      }

      try {
        // Built before the session is cleared, so it carries the ID token as `id_token_hint`.
        const redirectUrl: string = await client.signOut(sessionId);

        return {redirectUrl};
      } catch {
        return {redirectUrl: fallback};
      } finally {
        // Awaited, so the session cannot be used once sign-out has answered.
        await client.endSession(sessionId);
      }
    },

    async switchOrganizationUnit(_request: Request, ouId: string): Promise<BffSwitchResult> {
      const sessionId: string | undefined = sessionIdOf();

      if (!sessionId || !(await client.isSignedIn(sessionId))) {
        return {error: BffConstants.Errors.LOGIN_REQUIRED, status: 401};
      }

      const result: DeviceSecretSwitchResult | undefined = await client.switchOrganizationUnitWithDeviceSecret(
        ouId,
        sessionId,
      );

      if (!result) {
        // No device secret in the session: the browser switches through sign-in for the unit.
        return {error: 'interaction_required'};
      }

      return 'error' in result ? {error: result.error} : {ok: true};
    },
  };
};

/**
 * Serves the BFF contract of RFC 10017 from Express, so a React or Vue app in `backend` mode can use
 * this server as its BFF. Mount it after `thunderID()`:
 *
 * ```ts
 * app.use(cookieParser());
 * app.use(thunderID({...config, afterSignInUrl: 'https://app.example.com/api/auth/callback'}));
 * app.use(thunderIDBff());
 * ```
 *
 * It serves, under `/api/auth`: `GET signin`, `GET callback`, `GET session`, `GET checksession`,
 * `POST refresh`, `POST signout`, `POST switch`, `POST backchannel-logout` and the API proxy under
 * `proxy/`. Every call the browser SDK makes must carry `X-Requested-With: XMLHttpRequest`, and no
 * response carries a token. `afterSignInUrl` must be the `callback` endpoint on the app's origin.
 *
 * The session is kept in the SDK's session store, and the cookie holds only its ID. Requests outside
 * the prefix go on to the next handler. It needs `cookie-parser` mounted first.
 *
 * @param options - The prefix, the API to proxy to, and the allowed origins.
 */
const thunderIDBff = (options: ThunderIDBffOptions = {}): express.RequestHandler => {
  const prefix: string = (options.prefix ?? BffConstants.DEFAULT_PREFIX).replace(/\/+$/, '');
  const backchannelLogout: express.RequestHandler = handleBackchannelLogout();
  let warnedAboutCallback = false;

  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const path: string = req.originalUrl.split('?')[0] ?? '';

    if (path !== prefix && !path.startsWith(`${prefix}/`)) {
      next();

      return;
    }

    const client: ThunderIDExpressClient | undefined = (req as RequestWithClient).thunderIDAuth;

    if (!client) {
      Logger.error('thunderID() middleware must be mounted before thunderIDBff()');
      res.status(500).end();

      return;
    }

    if (path === `${prefix}${BffConstants.Endpoints.BACKCHANNEL_LOGOUT}`) {
      backchannelLogout(req, res, next);

      return;
    }

    const config = client.expressConfig;
    const appOrigin: string | undefined = config?.afterSignInUrl ? new URL(config.afterSignInUrl).origin : undefined;

    if (!warnedAboutCallback && config?.afterSignInUrl) {
      warnedAboutCallback = true;
      if (new URL(config.afterSignInUrl).pathname !== `${prefix}${BffConstants.Endpoints.CALLBACK}`) {
        Logger.warn(`afterSignInUrl should be ${prefix}${BffConstants.Endpoints.CALLBACK} on the app's origin.`);
      }
    }

    handleBffRequest(toWebRequest(req), createAdapter(client, req, res), {
      ...options,
      allowedOrigins: options.allowedOrigins ?? (appOrigin ? [appOrigin] : undefined),
      apiBaseUrl: options.apiBaseUrl ?? config?.baseUrl,
      prefix,
    })
      .then((response: Response | undefined) => (response ? sendWebResponse(response, res) : next()))
      .catch(next);
  };
};

export default thunderIDBff;
