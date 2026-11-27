// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getRequestOrigins, handleBffRequest} from '@thunderid/node';
import type {BffAdapter, BffSession} from '@thunderid/node';
import {defineEventHandler, sendWebResponse, toWebRequest} from 'h3';
import type {H3Event} from 'h3';
import {decodeJwt} from 'jose';
import type {ThunderIDSessionPayload} from '../../../../types';
import {deleteChunkedCookie} from '../../../utils/chunkedCookie';
import {useServerSession} from '../../../utils/serverSession';
import {getSessionCookieName, getSessionCookieOptions} from '../../../utils/session';
import {refreshServerSession} from '../../../utils/token-refresh';
import {useRuntimeConfig} from '#imports';

/** Refresh a little before the access token expires, as `getValidAccessToken` does. */
const REFRESH_SKEW_SECONDS = 60;

const toClaims = (session: ThunderIDSessionPayload): Record<string, unknown> => {
  if (session.idToken) {
    try {
      return decodeJwt(session.idToken) as Record<string, unknown>;
    } catch {
      // Fall back to the subject alone.
    }
  }

  return {sub: session.sub};
};

/**
 * Refreshes the session, or clears the cookie when it cannot be refreshed.
 *
 * @returns The refreshed session, or `null`.
 */
const refreshOrEnd = async (
  event: H3Event,
  session: ThunderIDSessionPayload,
): Promise<ThunderIDSessionPayload | null> => {
  try {
    return await refreshServerSession(event, session);
  } catch {
    deleteChunkedCookie(event, getSessionCookieName(), getSessionCookieOptions());

    return null;
  }
};

const notServedHere = (): never => {
  // Nuxt serves sign-in, the callback, sign-out and switch with its own routes, which take precedence.
  throw new Error('This endpoint is served by its own Nuxt route.');
};

const createAdapter = (event: H3Event): BffAdapter => ({
  callback: notServedHere,

  async getSession(): Promise<BffSession | null> {
    let session: ThunderIDSessionPayload | null = await useServerSession(event);

    if (
      session?.accessTokenExpiresAt &&
      session.accessTokenExpiresAt - REFRESH_SKEW_SECONDS <= Math.floor(Date.now() / 1000)
    ) {
      session = session.refreshToken ? await refreshOrEnd(event, session) : null;
    }

    return session
      ? {
          accessToken: session.accessToken,
          expiresAt: session.accessTokenExpiresAt ?? session.exp,
          idTokenClaims: toClaims(session),
          scope: session.scopes,
        }
      : null;
  },

  async isSessionLive(): Promise<boolean> {
    // Decrypts the cookie and refuses a session a back-channel logout ended, without refreshing it.
    return Boolean(await useServerSession(event));
  },

  async refresh(): Promise<boolean> {
    const session: ThunderIDSessionPayload | null = await useServerSession(event);

    return Boolean(session?.refreshToken && (await refreshOrEnd(event, session)));
  },

  signIn: notServedHere,
  signOut: notServedHere,
});

/**
 * Serves the BFF contract's `GET checksession`, `POST refresh` and API proxy under `/api/auth`, so a React
 * or Vue app in `backend` mode can use this Nuxt app as its BFF. The proxy forwards to the ThunderID
 * `baseUrl`. The other contract endpoints are Nuxt's own routes.
 */
export default defineEventHandler(async (event: H3Event): Promise<void> => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig(event);
  const request: Request = toWebRequest(event);
  const response: Response | undefined = await handleBffRequest(request, createAdapter(event), {
    allowedOrigins: getRequestOrigins(request),
    apiBaseUrl: config.public.thunderid?.baseUrl || undefined,
  });

  return sendWebResponse(event, response ?? new Response(null, {status: 404}));
});
