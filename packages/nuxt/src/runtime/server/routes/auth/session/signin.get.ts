// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {generateSessionId} from '@thunderid/node';
import {defineEventHandler, getQuery, sendRedirect, setCookie, createError} from 'h3';
import type {H3Event} from 'h3';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {createTempSessionToken, getTempSessionCookieName, getTempSessionCookieOptions} from '../../../utils/session';
import {useRuntimeConfig} from '#imports';

/**
 * GET /api/auth/signin
 *
 * Initiates the OAuth2 authorization code flow with PKCE.
 * Creates a temp session, stores it in a signed JWT cookie,
 * and redirects the user to ThunderID's authorization endpoint.
 *
 * Accepts an optional `returnTo` query parameter to redirect
 * the user to a specific page after sign-in, and an optional `ouId` that bounds the sign-in to that
 * organization unit (`{baseUrl}/ou/{ouId}/oauth2/authorize`). Switching organization units uses this:
 * the server reuses the SSO session, and the callback replaces the session only when it succeeds.
 */
export default defineEventHandler(async (event: H3Event) => {
  const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const sessionSecret: string | undefined = config.thunderid?.sessionSecret;

  const query: Record<string, unknown> = getQuery(event);
  const returnTo: string | undefined = query.returnTo as string | undefined;

  // Validate returnTo is a relative path to prevent open redirect
  const safeReturnTo: string | undefined =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : undefined;

  const ouId: unknown = query.ouId;
  const organizationUnitId: string | undefined = typeof ouId === 'string' && ouId.trim() !== '' ? ouId : undefined;

  const sessionId: string = generateSessionId();

  // Create temp session JWT and set as cookie (includes returnTo if provided)
  const tempToken: string = await createTempSessionToken(sessionId, sessionSecret, safeReturnTo);
  setCookie(event, getTempSessionCookieName(), tempToken, getTempSessionCookieOptions());

  // Get the authorization URL from the Node SDK
  // The signIn method calls the callback with the authorization URL when no code is provided
  let authorizationUrl: string | null = null;
  await client.signIn(
    (url: string): void => {
      authorizationUrl = url;
    },
    sessionId,
    undefined, // no authorization code (initial redirect)
    undefined, // no state
    organizationUnitId ? {organizationUnitId} : {},
  );

  if (!authorizationUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate authorization URL.',
    });
  }

  return sendRedirect(event, authorizationUrl, 302);
});
