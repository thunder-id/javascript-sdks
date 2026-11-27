// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CookieConfig, SessionCookie, resolveSessionCookieSameSite, resolveSessionSecret} from '@thunderid/node';
import type {IdToken, SessionCookieSameSite, TokenResponse} from '@thunderid/node';
import type {H3Event} from 'h3';
import type {ThunderIDSessionPayload} from '../../types';
import {setChunkedCookie} from './chunkedCookie';

const DEFAULT_EXPIRY_SECONDS = 3600;

const TEMP_SESSION_TTL_SECONDS = 15 * 60;

/**
 * The secret the session cookies are encrypted with: the module's `sessionSecret`, or
 * `THUNDERID_SESSION_SECRET`. Throws in production when neither is set or the secret is shorter than 32 bytes.
 */
function getSecret(sessionSecret?: string): string {
  return resolveSessionSecret({configured: sessionSecret, sdk: 'nuxt'});
}

/**
 * Whether the session cookies are `Secure`, and so carry the `__Host-` prefix.
 */
function isSecure(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Create a session cookie value, encrypted in the BFF contract's session cookie format.
 */
export async function createSessionToken(
  params: {
    accessToken: string;
    /** Unix timestamp (seconds) when the access token expires. */
    accessTokenExpiresAt?: number;
    expirySeconds?: number;
    /** Raw ID token string. */
    idToken?: string;
    organizationId?: string;
    /** Refresh token for silent re-auth. */
    refreshToken?: string;
    scopes: string;
    sessionId: string;
    /** The `sid` of the ID token. Back-channel logout ends the session by it. */
    sid?: string;
    /** Unix timestamp (seconds) of the sign-in. Defaults to now. */
    signedInAt?: number;
    userId: string;
  },
  sessionSecret?: string,
): Promise<string> {
  return SessionCookie.seal(
    {
      accessToken: params.accessToken,
      accessTokenExpiresAt: params.accessTokenExpiresAt,
      idToken: params.idToken,
      organizationId: params.organizationId,
      refreshToken: params.refreshToken,
      scopes: params.scopes,
      sessionId: params.sessionId,
      sid: params.sid,
      signedInAt: params.signedInAt ?? Math.floor(Date.now() / 1000),
      sub: params.userId,
      type: 'session',
    } as Omit<ThunderIDSessionPayload, 'iat' | 'exp'>,
    getSecret(sessionSecret),
    Math.floor(Date.now() / 1000) + (params.expirySeconds ?? DEFAULT_EXPIRY_SECONDS),
  );
}

/**
 * Create the temporary session cookie value used during the OAuth flow, encrypted like the session cookie.
 */
export async function createTempSessionToken(
  sessionId: string,
  sessionSecret?: string,
  returnTo?: string,
): Promise<string> {
  const payload: Record<string, unknown> = {
    sessionId,
    type: 'temp',
  };

  if (returnTo) {
    payload.returnTo = returnTo;
  }

  return SessionCookie.seal(
    payload,
    getSecret(sessionSecret),
    Math.floor(Date.now() / 1000) + TEMP_SESSION_TTL_SECONDS,
  );
}

/**
 * Decrypt a session cookie value. Throws when it is not a session cookie made with this secret, or has expired.
 */
export async function verifySessionToken(token: string, sessionSecret?: string): Promise<ThunderIDSessionPayload> {
  const payload: ThunderIDSessionPayload = await SessionCookie.unseal<ThunderIDSessionPayload>(
    token,
    getSecret(sessionSecret),
  );

  if (payload.type !== 'session') {
    throw new Error('Invalid token type: expected session');
  }

  return payload;
}

/**
 * Decrypt a temporary session cookie value.
 */
export async function verifyTempSessionToken(
  token: string,
  sessionSecret?: string,
): Promise<{returnTo?: string; sessionId: string}> {
  const payload: Record<string, unknown> = await SessionCookie.unseal(token, getSecret(sessionSecret));

  if (payload.type !== 'temp') {
    throw new Error('Invalid token type: expected temp session');
  }

  return {
    returnTo: payload.returnTo as string | undefined,
    sessionId: payload.sessionId as string,
  };
}

/**
 * Session cookie name.
 */
export function getSessionCookieName(vendor?: string): string {
  return CookieConfig.withHostPrefix(CookieConfig.getSessionCookieName(vendor), isSecure());
}

/**
 * Temp session cookie name.
 */
export function getTempSessionCookieName(vendor?: string): string {
  return CookieConfig.withHostPrefix(CookieConfig.getTempSessionCookieName(vendor), isSecure());
}

/**
 * Session cookie options.
 */
interface SessionCookieOptions {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: SessionCookieSameSite;
  secure: boolean;
}

/**
 * Session cookie options. `SameSite` is `Strict` unless `THUNDERID_SESSION_COOKIE_SAME_SITE` says otherwise.
 */
export function getSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    maxAge: DEFAULT_EXPIRY_SECONDS,
    path: '/',
    sameSite: resolveSessionCookieSameSite(),
    secure: isSecure(),
  };
}

/**
 * Options of the cookie that carries a sign-in in progress (15 min TTL). It is `Lax` whatever the session cookie is,
 * so it comes back on the redirect to the callback.
 */
export function getTempSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    maxAge: TEMP_SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: isSecure(),
  };
}

/**
 * Decode a token response into an encrypted session token and write it as the
 * session cookie on the H3 event.
 *
 * Extracted from the inline blocks in `callback.get.ts` and
 * `organizations/switch.post.ts` so that all three callers (callback.get,
 * switch.post, and the new `signin.post`) share one implementation.
 */
export async function issueSessionCookie(
  event: H3Event,
  sessionId: string,
  tokenResponse: TokenResponse,
  sessionSecret?: string,
): Promise<void> {
  // Lazy-import to avoid circular dep: session.ts → ThunderIDNuxtClient → session.ts
  const {default: ThunderIDNuxtClient} = await import('../ThunderIDNuxtClient');
  const client: ReturnType<typeof ThunderIDNuxtClient.getInstance> = ThunderIDNuxtClient.getInstance();

  const idToken: IdToken = await client.getDecodedIdToken(sessionId, tokenResponse.idToken);

  const userId: string = idToken.sub || sessionId;
  const organizationId: string | undefined = (idToken.user_org || idToken.organization_id) as string | undefined;
  const expiresInSeconds: number = parseInt(tokenResponse.expiresIn ?? '3600', 10);
  const accessTokenExpiresAt: number =
    Math.floor(Date.now() / 1000) + (Number.isFinite(expiresInSeconds) ? expiresInSeconds : 3600);

  const sessionToken: string = await createSessionToken(
    {
      accessToken: tokenResponse.accessToken,
      accessTokenExpiresAt,
      idToken: tokenResponse.idToken || undefined,
      organizationId,
      refreshToken: tokenResponse.refreshToken || undefined,
      scopes: tokenResponse.scope || '',
      sessionId,
      sid: typeof idToken.sid === 'string' ? idToken.sid : undefined,
      userId,
    },
    sessionSecret,
  );

  setChunkedCookie(event, getSessionCookieName(), sessionToken, getSessionCookieOptions());
}
