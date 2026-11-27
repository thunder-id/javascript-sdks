// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {ThunderIDAPIError, logger} from '@thunderid/node';
import {cookies} from 'next/headers';
import {ThunderIDNextConfig} from '../../models/config';
import {deleteChunkedCookie, getChunkedCookie, setChunkedCookie} from '../../utils/chunkedCookie';
import handleRefreshToken, {HandleRefreshTokenResult} from '../../utils/handleRefreshToken';
import SessionManager, {SessionTokenPayload} from '../../utils/SessionManager';
import getClient from '../getClient';

type RequestCookies = Awaited<ReturnType<typeof cookies>>;

/**
 * Client-safe result of a token refresh.
 *
 * Intentionally omits accessToken, refreshToken, idToken, and scopes — those stay
 * server-side in the HttpOnly session cookie. Returning tokens from a Server Action
 * serializes them into browser memory, defeating the HttpOnly boundary and exposing
 * them to XSS, browser extensions, and error-tracking SDKs.
 *
 * `expiresAt` is epoch seconds for the new access token; the client uses it to
 * schedule the next refresh.
 */
export interface RefreshResult {
  expiresAt: number;
}

/**
 * Server action to refresh the access token using the stored refresh token.
 * Exchanges the refresh token for a new token set and updates the session cookie.
 *
 * Delegates the HTTP exchange to handleRefreshToken so the same logic is shared
 * with the middleware token refresh path.
 *
 * Called from the client side (e.g. ThunderIDClientProvider refreshOnMount) where
 * Next.js allows cookie mutation. When invoked during SSR rendering the cookie
 * write is silently skipped and a warning is logged.
 */
const refreshToken = async (): Promise<RefreshResult> => {
  try {
    const cookieStore: RequestCookies = await cookies();
    const sessionToken: string | undefined = getChunkedCookie(cookieStore, SessionManager.getSessionCookieName());

    if (!sessionToken) {
      throw new ThunderIDAPIError(
        'No active session found. User must be signed in to refresh the token.',
        'refreshToken-ServerActionError-002',
        'nextjs',
        401,
      );
    }

    const sessionPayload: SessionTokenPayload = await SessionManager.verifySessionTokenForRefresh(sessionToken);
    const client = getClient();
    const config: ThunderIDNextConfig = await client.getConfiguration();

    const result: HandleRefreshTokenResult = await handleRefreshToken(sessionPayload, {
      baseUrl: config.baseUrl ?? '',
      clientId: config.clientId ?? '',
      clientSecret: config.clientSecret ?? '',
      sessionCookie: config.sessionCookie,
    });

    try {
      setChunkedCookie(
        cookieStore,
        SessionManager.getSessionCookieName(),
        result.newSessionToken,
        SessionManager.getSessionCookieOptions(result.sessionCookieExpiryTime),
      );
    } catch {
      // cookies().set() is only permitted inside a Server Action invoked from the client
      // or a Route Handler. When this action is called during SSR rendering the write
      // is blocked by Next.js. The middleware refresh path handles that case instead.
      logger.warn('[refreshToken] Could not write session cookie — called from SSR rendering context.');
    }

    const rawExpiresIn: string | undefined = result.tokenResponse.expiresIn;
    const expiresInSeconds: number = parseInt(rawExpiresIn ?? '', 10);
    if (Number.isNaN(expiresInSeconds)) {
      throw new Error(`[refreshToken] Invalid expiresIn value received: ${rawExpiresIn}`);
    }
    const expiresAt: number = Math.floor(Date.now() / 1000) + expiresInSeconds;

    logger.debug('[refreshToken] Token refresh succeeded.');
    return {expiresAt};
  } catch (error) {
    // Clear the dead session cookie before throwing so the browser is not left
    // holding a stale credential. This is best-effort — if called from an SSR
    // rendering context Next.js blocks cookie mutation; the middleware cleanup
    // path covers that case on the next request.
    try {
      const cookieStore: RequestCookies = await cookies();
      deleteChunkedCookie(
        cookieStore,
        SessionManager.getSessionCookieName(),
        SessionManager.getSessionCookieOptions(0),
      );
      logger.debug('[refreshToken] Cleared session cookie after refresh failure.');
    } catch {
      // Intentionally swallowed — middleware handles cleanup when mutation is blocked.
    }

    throw new ThunderIDAPIError(
      `Failed to refresh the session: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      'refreshToken-ServerActionError-001',
      'nextjs',
      error instanceof ThunderIDAPIError ? error.statusCode : undefined,
    );
  }
};

export default refreshToken;
