/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {Inject, Injectable} from '@nestjs/common';
import {
  SESSION_COOKIE_NAME,
  ThunderIDExpressClient,
  ThunderIDRuntimeError,
  TokenResponse,
  User,
} from '@thunderid/express';
import type express from 'express';
import {THUNDERID_CONFIG} from './constants/InjectionTokens';
import {ThunderIDNestConfig} from './models/config';

/**
 * Injectable service exposing ThunderID authentication to NestJS applications.
 *
 * Register it once with `ThunderIDModule.forRoot(config)` and inject it into
 * controllers:
 *
 * ```ts
 * @Controller()
 * export class AuthController {
 *   constructor(private readonly thunderID: ThunderIDService) {}
 *
 *   @Get('login')
 *   async login(@Req() req: Request, @Res() res: Response) {
 *     const tokens = await this.thunderID.signIn(req, res);
 *     if (tokens.accessToken || tokens.idToken) res.redirect('/');
 *   }
 * }
 * ```
 *
 * Requires `cookie-parser` middleware to be registered on the application.
 */
@Injectable()
class ThunderIDService {
  private readonly client: ThunderIDExpressClient = new ThunderIDExpressClient();
  private initPromise: Promise<boolean> | undefined;

  public constructor(@Inject(THUNDERID_CONFIG) private readonly config: ThunderIDNestConfig) {}

  /** The underlying `ThunderIDExpressClient` for advanced use cases. */
  public getClient(): ThunderIDExpressClient {
    return this.client;
  }

  private static getSessionId(req: express.Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[SESSION_COOKIE_NAME];
  }

  private ensureInitialized(req: express.Request): Promise<boolean> {
    if (this.initPromise === undefined) {
      const origin = `${req.protocol}://${req.get('host')}`;
      this.initPromise = this.client.initialize({
        ...this.config,
        afterSignInUrl: this.config.afterSignInUrl ?? `${origin}/login`,
        afterSignOutUrl: this.config.afterSignOutUrl ?? `${origin}/logout`,
      });
    }
    return this.initPromise;
  }

  /**
   * Handles the sign-in path.
   *
   * - If the request has no `?code` query param, initiates the OAuth 2.0
   *   redirect (the response is sent by the SDK — do not write to it after).
   * - If the request has `?code`, exchanges the authorization code for tokens,
   *   sets the session cookie, and returns the token response.
   */
  public async signIn(
    req: express.Request,
    res: express.Response,
    signInOptions?: Record<string, string | boolean>,
  ): Promise<TokenResponse> {
    await this.ensureInitialized(req);
    return this.client.signIn(req, res, (): void => undefined, signInOptions ?? this.config.signInOptions);
  }

  /**
   * Handles the sign-out path: clears the session cookie and redirects the
   * response to the identity provider's end-session endpoint.
   *
   * Check {@link isSignOutSuccess} first to detect the identity provider's
   * redirect back after a completed sign-out.
   *
   * @throws ThunderIDRuntimeError when the request has no session cookie.
   */
  public async signOut(req: express.Request, res: express.Response): Promise<void> {
    await this.ensureInitialized(req);

    const sessionId: string | undefined = ThunderIDService.getSessionId(req);

    if (!sessionId) {
      throw new ThunderIDRuntimeError('No cookie found in the request', 'NESTJS-SERVICE-SO-NF01', 'nestjs');
    }

    const signOutURL: string = await this.client.signOut(sessionId);

    if (signOutURL) {
      res.cookie(SESSION_COOKIE_NAME, '', {maxAge: 0});
      res.redirect(signOutURL);
    }
  }

  /** Whether the request is the identity provider's redirect back after a completed sign-out. */
  public isSignOutSuccess(req: express.Request): boolean {
    return req.query['state'] === 'sign_out_success';
  }

  /** Whether the request carries a valid ThunderID session. */
  public async isSignedIn(req: express.Request): Promise<boolean> {
    await this.ensureInitialized(req);
    const sessionId: string | undefined = ThunderIDService.getSessionId(req);

    if (!sessionId) {
      return false;
    }

    return (await this.client.isSignedIn(sessionId)) ?? false;
  }

  /** Returns the authenticated user for the request's session, or `undefined`. */
  public async getUser(req: express.Request): Promise<User | undefined> {
    await this.ensureInitialized(req);
    return this.client.getUserFromRequest(req);
  }
}

export default ThunderIDService;
