// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {TokenResponse, SessionCookieConfig} from '@thunderid/node';
import SessionManager, {SessionTokenPayload} from './SessionManager';

/**
 * Config required to call the token endpoint.
 */
export interface HandleRefreshTokenConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  sessionCookie?: SessionCookieConfig;
}

/**
 * Result returned by handleRefreshToken.
 * Callers are responsible for persisting newSessionToken in the appropriate cookie context.
 */
export interface HandleRefreshTokenResult {
  newSessionToken: string;
  sessionCookieExpiryTime: number;
  tokenResponse: TokenResponse;
}

/**
 * Handles the OAuth refresh_token grant and builds a new session JWT string.
 *
 * Intentionally decoupled from cookie APIs so it can be called from both the Edge
 * Runtime (Next.js middleware) and the Node.js Runtime (server actions).
 * Cookie persistence is the caller's responsibility.
 */
const handleRefreshToken = async (
  sessionPayload: SessionTokenPayload,
  config: HandleRefreshTokenConfig,
): Promise<HandleRefreshTokenResult> => {
  const {baseUrl, clientId, clientSecret, sessionCookie} = config;
  const {
    refreshToken: storedRefreshToken,
    sessionId,
    sub,
    scopes,
    organizationId,
    sid,
    signedInAt,
    iat,
    idToken: storedIdToken,
  } = sessionPayload;

  if (!storedRefreshToken) {
    throw new Error('No refresh token found in session payload.');
  }

  const tokenEndpoint = `${baseUrl}/oauth2/token`;
  const body: URLSearchParams = new URLSearchParams({
    client_id: clientId ?? '',
    client_secret: clientSecret ?? '',
    grant_type: 'refresh_token',
    refresh_token: storedRefreshToken,
  });

  let response: Response;

  try {
    response = await fetch(tokenEndpoint, {
      body: body.toString(),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      method: 'POST',
    });
  } catch (fetchError) {
    throw new Error(
      `Token refresh network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
    );
  }

  if (!response.ok) {
    throw new Error(`Token endpoint rejected refresh (HTTP ${response.status}).`);
  }

  let tokenData: Record<string, unknown>;

  try {
    tokenData = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error('Failed to parse token endpoint response as JSON.');
  }

  const newAccessToken: string = tokenData['access_token'] as string;
  const expiresIn: number = tokenData['expires_in'] as number;
  // Use the rotated refresh token if the server provided one; otherwise keep the existing one.
  const newRefreshToken: string = (tokenData['refresh_token'] as string | undefined) ?? storedRefreshToken;
  const newScopes: string =
    (tokenData['scope'] as string | undefined) ??
    (Array.isArray(scopes) ? scopes.join(' ') : ((scopes as string) ?? ''));

  const resolvedSessionCookieExpiry: number = SessionManager.resolveSessionCookieExpiry(sessionCookie?.expiryTime);

  const newSessionToken: string = await SessionManager.createSessionToken(
    newAccessToken,
    sub,
    sessionId,
    newScopes,
    expiresIn,
    newRefreshToken,
    organizationId,
    // A refreshed session is still the same sign-in, so it keeps what a logout matches it by.
    {idToken: (tokenData['id_token'] as string | undefined) ?? storedIdToken, sid, signedInAt: signedInAt ?? iat},
  );

  return {
    newSessionToken,
    sessionCookieExpiryTime: resolvedSessionCookieExpiry,
    tokenResponse: {
      accessToken: newAccessToken,
      createdAt: Math.floor(Date.now() / 1000),
      expiresIn: String(expiresIn),
      idToken: (tokenData['id_token'] as string | undefined) ?? '',
      refreshToken: newRefreshToken,
      scope: newScopes,
      tokenType: (tokenData['token_type'] as string | undefined) ?? 'Bearer',
    },
  };
};

export default handleRefreshToken;
