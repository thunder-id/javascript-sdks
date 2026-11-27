// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDRuntimeError, TokenResponse, logger as Logger, renderSignInContinuePage} from '@thunderid/node';
import express from 'express';
import {ThunderIDExpressConfig} from '../models/config';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

/**
 * Returns Express middleware that initialises the ThunderID client and attaches
 * it to `req.thunderIDAuth` for use in route handlers and `protect()`.
 *
 * Unlike the old `thunderID()` router, this function does **not** mount any
 * routes automatically. Register sign-in and sign-out handlers explicitly:
 *
 * ```ts
 * app.use(thunderID(config));
 * app.get('/login',  handleSignIn());
 * app.get('/logout', handleSignOut());
 * ```
 *
 * @param config - ThunderID Express configuration.
 */
const thunderID = (config: ThunderIDExpressConfig): express.RequestHandler => {
  const client = new ThunderIDExpressClient();
  let initPromise: Promise<boolean> | undefined;

  const getInitPromise = (req: express.Request): Promise<boolean> => {
    if (initPromise === undefined) {
      const origin = `${req.protocol}://${req.get('host')}`;
      initPromise = client.initialize({
        ...config,
        afterSignInUrl: config.afterSignInUrl ?? `${origin}/login`,
        afterSignOutUrl: config.afterSignOutUrl ?? `${origin}/logout`,
      });
    }
    return initPromise;
  };

  return async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    await getInitPromise(req);
    (req as any).thunderIDAuth = client;
    (res as any).thunderIDAuth = client;
    next();
  };
};

/**
 * Makes `res.redirect` answer with a page that moves on to the target, instead of a `302`. A redirect from the
 * callback still belongs to the identity provider's cross-site chain, so the browser would leave out the `Strict`
 * session cookie just set, and a protected page would send the user back through sign-in without end.
 */
const continueWithPage = (res: express.Response): void => {
  res.redirect = ((first: string | number, second?: string): void => {
    const target: string = typeof first === 'string' ? first : (second ?? '/');

    res
      .status(200)
      .set({'cache-control': 'no-store', 'content-type': 'text/html; charset=utf-8'})
      .send(renderSignInContinuePage(target));
  }) as express.Response['redirect'];
};

/**
 * Returns an Express route handler for the sign-in path.
 *
 * - If the request has no `?code` query param, initiates the OAuth 2.0 redirect.
 * - If the request has `?code`, exchanges the authorization code for tokens,
 *   sets the session cookie, and calls `onSignIn`.
 *
 * Must be used after `thunderID()` middleware so that `req.thunderIDAuth` is set.
 *
 * ```ts
 * app.get('/login', handleSignIn());
 * ```
 */
const handleSignIn = (): express.RequestHandler => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    const client: ThunderIDExpressClient | undefined = (req as any).thunderIDAuth;

    if (!client) {
      Logger.error('thunderID() middleware must be mounted before handleSignIn()');
      res.status(500).end();
      return;
    }

    const config = client.expressConfig;
    const onSignIn = config?.onSignIn ?? ((r: express.Response) => r.end());
    const onError =
      config?.onError ??
      ((r: express.Response, e: ThunderIDRuntimeError) => {
        Logger.error(e.message);
        r.status(500).end();
      });

    try {
      const response: TokenResponse = await client.signIn(req, res, next, config?.signInOptions);
      if (response.accessToken || response.idToken) {
        if (client.getSessionCookieOptions().sameSite === 'strict') {
          continueWithPage(res);
        }
        onSignIn(res, response);
      }
    } catch (e: any) {
      Logger.error(e.message);
      onError(res, e);
    }
  };
};

/**
 * Returns an Express route handler for the sign-out path.
 *
 * - Clears the session cookie and redirects to the identity provider's
 *   end-session endpoint.
 * - When the identity provider redirects back with `?state=sign_out_success`,
 *   calls `onSignOut`.
 *
 * Must be used after `thunderID()` middleware so that `req.thunderIDAuth` is set.
 *
 * ```ts
 * app.get('/logout', handleSignOut());
 * ```
 */
const handleSignOut = (): express.RequestHandler => {
  return async (req: express.Request, res: express.Response): Promise<void> => {
    const client: ThunderIDExpressClient | undefined = (req as any).thunderIDAuth;

    if (!client) {
      Logger.error('thunderID() middleware must be mounted before handleSignOut()');
      res.status(500).end();
      return;
    }

    const config = client.expressConfig;
    const onSignOut = config?.onSignOut ?? ((r: express.Response) => r.end());
    const onError =
      config?.onError ??
      ((r: express.Response, e: ThunderIDRuntimeError) => {
        Logger.error(e.message);
        r.status(500).end();
      });

    if ((req.query as any).state === 'sign_out_success') {
      onSignOut(res);
      return;
    }

    const cookieName = client.getSessionCookieName();
    const sessionId: string | undefined = req.cookies?.[cookieName];

    if (!sessionId) {
      onError(
        res,
        new ThunderIDRuntimeError('No cookie found in the request', 'EXPRESS-AUTH_MW-LOGOUT-NF01', 'express'),
      );
      return;
    }

    try {
      const signOutURL: string = await client.signOut(sessionId);
      if (signOutURL) {
        client.clearSessionCookie(res);
        res.redirect(signOutURL);
      }
    } catch (e: any) {
      onError(res, e);
    }
  };
};

export {thunderID, handleSignIn, handleSignOut};
