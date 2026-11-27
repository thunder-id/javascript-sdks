// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ThunderIDNodeClient,
  ThunderIDAuthException,
  ExtendedAuthorizeRequestUrlParams,
  FlowSessionStore,
  ThunderIDNodeManagementClient,
  ThunderIDRuntimeError,
  SessionData,
  Storage,
  TokenResponse,
  User,
  CookieConfig as NodeCookieConfig,
  resolveSessionCookieSameSite,
} from '@thunderid/node';
import express from 'express';
import {v4 as uuidv4} from 'uuid';
import CookieConfig from './constants/CookieConfig';
import {ExpressClientConfig} from './models/config';
import hasErrorInURL from './utils/expressUtils';

class ThunderIDExpressClient<T extends ExpressClientConfig = ExpressClientConfig> extends ThunderIDNodeClient<T> {
  private _expressConfig: ExpressClientConfig | undefined;

  public constructor() {
    super();
  }

  public override async initialize(config: T, storage?: Storage): Promise<boolean> {
    this._expressConfig = config;
    return super.initialize(config, storage);
  }

  public get expressConfig(): ExpressClientConfig | undefined {
    return this._expressConfig;
  }

  /**
   * Where an embedded flow's SSO sessions wait between its steps: the client's storage, one entry per flow, so
   * flows of different users never share one, and instances sharing a store share them too.
   */
  public get flowSessionStore(): FlowSessionStore {
    return this.getStorageManager();
  }

  /**
   * Resolves the session cookie name for this client instance, honoring an
   * explicit `sessionCookie.name` override before falling back to the
   * `vendor`-derived default (which itself defaults to `'thunderid'`).
   */
  public getSessionCookieName(): string {
    const configuredName: string | undefined = this._expressConfig?.sessionCookie?.name;
    const name: string = NodeCookieConfig.resolveSessionCookieName(this._expressConfig?.vendor, configuredName);

    // A name the app chose is kept as it is; the default gets `__Host-` when the cookie is Secure.
    return configuredName ? name : NodeCookieConfig.withHostPrefix(name, this.getSessionCookieOptions().secure);
  }

  /**
   * The attributes the session cookie is set with. `Secure` defaults to on in production, and the
   * cookie is always on `Path=/` with no `Domain`, so it can carry the `__Host-` prefix.
   */
  public getSessionCookieOptions(): express.CookieOptions & {maxAge: number; secure: boolean} {
    const sc = this._expressConfig?.sessionCookie;

    return {
      httpOnly: sc?.httpOnly ?? CookieConfig.defaultHttpOnly,
      maxAge: (sc?.expiryTime ?? CookieConfig.defaultExpirySeconds) * 1000,
      path: '/',
      sameSite: resolveSessionCookieSameSite(sc?.sameSite),
      secure: sc?.secure ?? process.env['NODE_ENV'] === 'production',
    };
  }

  /**
   * The tokens a session holds, without refreshing them, or `undefined` when there is no such session.
   * A back-channel logout removes the session, so this is also how to check it is still live.
   */
  public async getSessionData(sessionId: string): Promise<SessionData | undefined> {
    try {
      const data: SessionData | undefined = await this.getStorageManager().getSessionData(sessionId);

      return data?.access_token ? data : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Removes a session from the store and waits for it, unlike `clearSession`, which does not wait.
   *
   * @param sessionId - The session to remove.
   */
  public async endSession(sessionId: string): Promise<void> {
    await this.clearSessionAsync(sessionId);
  }

  /**
   * Deletes the session cookie. The deletion repeats the cookie's attributes, without which a
   * browser ignores it for a `__Host-` cookie.
   */
  public clearSessionCookie(res: express.Response): void {
    const {httpOnly, path, sameSite, secure} = this.getSessionCookieOptions();

    res.clearCookie(this.getSessionCookieName(), {httpOnly, path, sameSite, secure});
  }

  /**
   * The name of the cookie that carries a sign-in in progress: `thunderid-session-state`, with `__Host-` when
   * `Secure`. It holds the session ID the authorization request's `state` and PKCE verifier are stored under.
   */
  public getSessionStateCookieName(): string {
    return NodeCookieConfig.withHostPrefix(
      NodeCookieConfig.getTempSessionCookieName(this._expressConfig?.vendor),
      this.getSessionCookieOptions().secure,
    );
  }

  /**
   * The attributes of the sign-in cookie. It is `SameSite=Lax` whatever the session cookie is, so it comes back on
   * the redirect to the callback, which a `Strict` session cookie does not.
   */
  public getSessionStateCookieOptions(): express.CookieOptions & {maxAge: number; secure: boolean} {
    return {
      httpOnly: true,
      maxAge: CookieConfig.sessionStateMaxAgeSeconds * 1000,
      path: '/',
      sameSite: 'lax',
      secure: this.getSessionCookieOptions().secure,
    };
  }

  /**
   * Deletes the sign-in cookie, repeating its attributes.
   */
  public clearSessionStateCookie(res: express.Response): void {
    const {httpOnly, path, sameSite, secure} = this.getSessionStateCookieOptions();

    res.clearCookie(this.getSessionStateCookieName(), {httpOnly, path, sameSite, secure});
  }

  public async getUserFromRequest(req: express.Request): Promise<User | undefined> {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const sessionId: string | undefined = cookies?.[this.getSessionCookieName()];
    return this.getUser(sessionId);
  }

  /**
   * Returns the management operations bound to the session named by the request's session cookie,
   * so a route handler can administer users, groups, roles, and agents as the signed-in user. The
   * session's access token stays on the server and is read on every call.
   *
   * ```ts
   * app.get('/admin/users', protect(), async (req, res) => {
   *   const admin = req.thunderIDAuth.managementFromRequest(req);
   *   res.json(await admin.users.list({limit: 20}));
   * });
   * ```
   *
   * @throws {ThunderIDRuntimeError} `EXPRESS-CLIENT-MFR-NF01` when the request carries no session cookie.
   */
  public managementFromRequest(req: express.Request): ThunderIDNodeManagementClient {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const sessionId: string | undefined = cookies?.[this.getSessionCookieName()];

    if (!sessionId) {
      throw new ThunderIDRuntimeError('No session cookie found in the request.', 'EXPRESS-CLIENT-MFR-NF01', 'express');
    }

    return this.management(sessionId);
  }

  public async updateUserCredentialsFromRequest(req: express.Request, payload: Record<string, string>): Promise<void> {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const sessionId: string | undefined = cookies?.[this.getSessionCookieName()];
    return this.updateUserCredentials(payload, sessionId);
  }

  public override async signIn(
    req: express.Request,
    res: express.Response,
    next?: express.NextFunction,
    signInConfig?: ExtendedAuthorizeRequestUrlParams,
  ): Promise<TokenResponse> {
    if (hasErrorInURL(req.originalUrl)) {
      return Promise.reject(
        new ThunderIDAuthException(
          'EXPRESS-CLIENT-SI-IV01',
          'Invalid login request URL',
          'Login request contains an error query parameter in the URL',
        ),
      );
    }

    const cookieName: string = this.getSessionCookieName();
    const stateCookieName: string = this.getSessionStateCookieName();
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    // The callback finds its sign-in through the sign-in cookie: a Strict session cookie does not come back on the
    // identity provider's redirect. Starting a sign-in keeps the session already on this browser, if any.
    const userId: string =
      (req.query['code'] ? (cookies[stateCookieName] ?? cookies[cookieName]) : cookies[cookieName]) ?? uuidv4();

    const authRedirectCallback = (url: string): void => {
      if (!url) return;

      res.cookie(stateCookieName, userId, this.getSessionStateCookieOptions());
      // The redirect is the response, so the request ends here rather than going on to later routes.
      res.redirect(url);
    };

    // `?ouId=` bounds the sign-in to an organization unit, as a backend's sign-in endpoint does. On the
    // callback the unit is already recorded with the request, so the parameter is not needed there.
    const ouId: unknown = req.query['ouId'];
    const resolvedSignInConfig: ExtendedAuthorizeRequestUrlParams | undefined =
      typeof ouId === 'string' && ouId !== '' && !req.query['code']
        ? {...signInConfig, organizationUnitId: ouId}
        : signInConfig;

    const authResponse: TokenResponse = (await super.signIn(
      authRedirectCallback,
      userId,
      req.query['code'] as string | undefined,
      req.query['state'] as string | undefined,
      resolvedSignInConfig,
    )) as unknown as TokenResponse;

    if (authResponse.accessToken || authResponse.idToken) {
      // The session cookie is set only once the sign-in has completed.
      res.cookie(cookieName, userId, this.getSessionCookieOptions());
      this.clearSessionStateCookie(res);

      return authResponse;
    }

    return {
      accessToken: '',
      createdAt: 0,
      expiresIn: '',
      idToken: '',
      refreshToken: '',
      scope: '',
      tokenType: '',
    };
  }

  public override async signOut(userId?: string): Promise<string> {
    return super.signOut(userId);
  }
}

export default ThunderIDExpressClient;
