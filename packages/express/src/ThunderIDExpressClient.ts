// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ThunderIDNodeClient,
  ThunderIDAuthException,
  Storage,
  TokenResponse,
  User,
  CookieConfig as NodeCookieConfig,
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
   * Resolves the session cookie name for this client instance, honoring an
   * explicit `sessionCookie.name` override before falling back to the
   * `vendor`-derived default (which itself defaults to `'thunderid'`).
   */
  public getSessionCookieName(): string {
    return NodeCookieConfig.resolveSessionCookieName(
      this._expressConfig?.vendor,
      this._expressConfig?.sessionCookie?.name,
    );
  }

  public async getUserFromRequest(req: express.Request): Promise<User | undefined> {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const sessionId: string | undefined = cookies?.[this.getSessionCookieName()];
    return this.getUser(sessionId);
  }

  public async updateUserCredentialsFromRequest(req: express.Request, payload: Record<string, string>): Promise<void> {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const sessionId: string | undefined = cookies?.[this.getSessionCookieName()];
    return this.updateUserCredentials(payload, sessionId);
  }

  public override async signIn(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
    signInConfig?: Record<string, string | boolean>,
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

    const cookieName = this.getSessionCookieName();
    let userId: string = req.cookies?.[cookieName];
    if (!userId) {
      userId = uuidv4();
    }

    const sc = this._expressConfig?.sessionCookie;

    const authRedirectCallback = (url: string): void => {
      if (!url) return;

      res.cookie(cookieName, userId, {
        httpOnly: sc?.httpOnly ?? CookieConfig.defaultHttpOnly,
        maxAge: (sc?.expiryTime ?? CookieConfig.defaultExpirySeconds) * 1000,
        sameSite: (sc?.sameSite ?? CookieConfig.defaultSameSite) as any,
        secure: sc?.secure ?? CookieConfig.defaultSecure,
      });
      res.redirect(url);
      if (typeof next === 'function') next();
    };

    const authResponse: TokenResponse = (await super.signIn(
      authRedirectCallback,
      userId,
      req.query['code'] as string | undefined,
      req.query['session_state'] as string | undefined,
      req.query['state'] as string | undefined,
      signInConfig,
    )) as unknown as TokenResponse;

    if (authResponse.accessToken || authResponse.idToken) {
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
