// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {createError, type H3Event} from 'h3';
import {requireServerSession} from './serverSession';
import {createSessionToken, getSessionCookieName, getSessionCookieOptions} from './session';
import {setChunkedCookie} from './chunkedCookie';
import type {ThunderIDSessionPayload} from '../../types';
import {useRuntimeConfig} from '#imports';

/**
 * Seconds before expiry at which we proactively refresh the access token.
 * Refreshing 60 s early avoids races where the token expires mid-request.
 */
const REFRESH_SKEW_SECONDS = 60;

/**
 * Shape of an OIDC token endpoint refresh response (snake_case JSON).
 */
interface OIDCTokenRefreshResponse {
  access_token: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

/**
 * Return a valid access token for the current request.
 *
 * If the stored access token is still fresh (or has no expiry metadata —
 * e.g. sessions created before Phase 2), it is returned as-is.
 *
 * When the token is within `REFRESH_SKEW_SECONDS` of expiring and a
 * refresh token is present, a `refresh_token` grant is sent to the OIDC
 * token endpoint.  On success the session cookie is reissued with the new
 * tokens so subsequent calls within the same browser session are also fresh.
 *
 * Throws a 401 if the token is expired and no refresh token is available, or
 * if the refresh call itself fails.
 *
 * @example
 * ```ts
 * // In a Nitro API route:
 * export default defineEventHandler(async (event) => {
 *   const accessToken = await getValidAccessToken(event);
 *   // use accessToken to call a protected API
 * });
 * ```
 */
export async function getValidAccessToken(event: H3Event): Promise<string> {
  const session: ThunderIDSessionPayload = await requireServerSession(event);
  const now: number = Math.floor(Date.now() / 1000);

  // If no expiry metadata (old session pre-Phase-2) or token still fresh, return as-is.
  if (!session.accessTokenExpiresAt || session.accessTokenExpiresAt - REFRESH_SKEW_SECONDS > now) {
    return session.accessToken;
  }

  // Token is expired (or within skew window). Attempt silent refresh.
  return (await refreshServerSession(event, session)).accessToken;
}

/**
 * Refreshes the session's tokens with its refresh token and writes the new session cookie.
 *
 * @returns The refreshed session.
 * @throws A `401` error when the session holds no refresh token or the refresh fails.
 */
export async function refreshServerSession(
  event: H3Event,
  session: ThunderIDSessionPayload,
): Promise<ThunderIDSessionPayload> {
  if (!session.refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session expired. Please sign in again.',
    });
  }

  const now: number = Math.floor(Date.now() / 1000);
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig(event);
  const publicConfig: typeof config.public.thunderid = config.public.thunderid;
  const privateConfig: typeof config.thunderid = config.thunderid;

  const tokenEndpoint = `${publicConfig.baseUrl}/oauth2/token`;

  const body: URLSearchParams = new URLSearchParams({
    client_id: publicConfig.clientId,
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });

  if (privateConfig?.clientSecret) {
    body.set('client_secret', privateConfig.clientSecret);
  }

  let refreshed: OIDCTokenRefreshResponse;
  try {
    const res: Response = await fetch(tokenEndpoint, {
      body,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      method: 'POST',
    });

    if (!res.ok) {
      const errText: string = await res.text().catch(() => String(res.status));
      throw new Error(`Token endpoint returned ${res.status}: ${errText}`);
    }

    refreshed = (await res.json()) as OIDCTokenRefreshResponse;
  } catch (err: unknown) {
    const msg: string = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[thunderid] Token refresh failed:', msg);
    throw createError({
      statusCode: 401,
      statusMessage: 'Token refresh failed. Please sign in again.',
    });
  }

  // Re-issue session JWT with the refreshed tokens.
  const refreshedSession: Parameters<typeof createSessionToken>[0] = {
    accessToken: refreshed.access_token,
    accessTokenExpiresAt: now + (refreshed.expires_in ?? 3600),
    idToken: refreshed.id_token ?? session.idToken,
    organizationId: session.organizationId,
    refreshToken: refreshed.refresh_token ?? session.refreshToken,
    scopes: refreshed.scope ?? session.scopes,
    sessionId: session.sessionId,
    sid: session.sid,
    signedInAt: session.signedInAt ?? session.iat,
    userId: session.sub,
  };
  const newSessionToken: string = await createSessionToken(refreshedSession, privateConfig?.sessionSecret);

  setChunkedCookie(event, getSessionCookieName(), newSessionToken, getSessionCookieOptions());

  const {userId, ...claims} = refreshedSession;

  return {...session, ...claims, sub: userId} as ThunderIDSessionPayload;
}
