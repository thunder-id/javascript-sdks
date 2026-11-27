// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {renderSignInContinuePage} from '@thunderid/node';
import type {TokenResponse} from '@thunderid/node';
import {defineEventHandler, getQuery, getCookie, deleteCookie, sendRedirect, createError, setResponseHeader} from 'h3';
import type {H3Event} from 'h3';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {
  issueSessionCookie,
  verifyTempSessionToken,
  getTempSessionCookieName,
  getTempSessionCookieOptions,
  getSessionCookieOptions,
} from '../../../utils/session';
import {useRuntimeConfig} from '#imports';

/**
 * GET /api/auth/callback
 *
 * Handles the OAuth2 callback from ThunderID.
 * Exchanges the authorization code for tokens,
 * creates an encrypted session cookie,
 * and redirects to afterSignInUrl.
 */
export default defineEventHandler(async (event: H3Event) => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const sessionSecret: string | undefined = config.thunderid?.sessionSecret;
  const publicConfig: typeof config.public.thunderid = config.public.thunderid;

  const query: Record<string, unknown> = getQuery(event);
  const code: string | undefined = query.code as string | undefined;
  const state: string | undefined = query.state as string | undefined;
  const error: string | undefined = query.error as string | undefined;
  const errorDescription: string | undefined = query.error_description as string | undefined;

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Authentication failed: ${errorDescription || error}`,
    });
  }

  if (!code || !state) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required OAuth parameters: code and state are required.',
    });
  }

  // Retrieve and verify temp session
  const tempSessionCookie: string | undefined = getCookie(event, getTempSessionCookieName());
  if (!tempSessionCookie) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No temporary session found. Please start the sign-in flow again.',
    });
  }

  let sessionId: string;
  let returnTo: string | undefined;
  try {
    const tempSession: Awaited<ReturnType<typeof verifyTempSessionToken>> = await verifyTempSessionToken(
      tempSessionCookie,
      sessionSecret,
    );
    sessionId = tempSession.sessionId;
    returnTo = tempSession.returnTo;
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired temporary session. Please start the sign-in flow again.',
    });
  }

  // Exchange authorization code for tokens using the Node SDK.
  const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();

  let tokenResponse: TokenResponse;
  try {
    tokenResponse = await client.signIn(
      () => {}, // no-op redirect callback (we're handling the code exchange)
      sessionId,
      code,
      state,
    );
  } catch (err: any) {
    throw createError({
      data: err?.message || 'An unexpected error occurred during token exchange.',
      statusCode: 500,
      statusMessage: 'Token exchange failed.',
    });
  }

  if (!tokenResponse?.accessToken && !tokenResponse?.idToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Token exchange failed: Invalid response from Identity Provider.',
    });
  }

  // Create the encrypted session cookie
  try {
    await issueSessionCookie(event, sessionId, tokenResponse, sessionSecret);
    deleteCookie(event, getTempSessionCookieName(), getTempSessionCookieOptions());
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[thunderid] Failed to create JWT session:', err?.message || err);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to establish session after authentication.',
    });
  }

  // Redirect to returnTo (from sign-in request) or configured afterSignInUrl
  const redirectUrl: string = returnTo || publicConfig.afterSignInUrl || '/';

  if (getSessionCookieOptions().sameSite === 'strict') {
    // A redirect would still belong to the identity provider's cross-site chain, so the browser would leave out the
    // Strict session cookie just set. A page on this site moves on instead, which makes the next request same-site.
    setResponseHeader(event, 'cache-control', 'no-store');
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8');

    return renderSignInContinuePage(redirectUrl);
  }

  return sendRedirect(event, redirectUrl, 302);
});
