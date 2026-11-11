// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedSignInFlowStatus, generateSessionId, isEmpty} from '@thunderid/node';
import type {IdToken, TokenResponse} from '@thunderid/node';
import {defineEventHandler, readBody, getCookie, setCookie, deleteCookie, createError} from 'h3';
import type {H3Event} from 'h3';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {useServerSession} from '../../../utils/serverSession';
import {
  issueSessionCookie,
  createTempSessionToken,
  verifyTempSessionToken,
  getTempSessionCookieName,
  getTempSessionCookieOptions,
} from '../../../utils/session';
import {useRuntimeConfig} from '#imports';

/**
 * POST /api/auth/signin
 *
 * Handles embedded (app-native) sign-in flow steps.
 *
 * Request body:
 * - `payload` — the embedded flow step payload.
 *   When omitted or `{}`, the flow is initialised and the authorize URL is returned.
 * - `request` — optional per-step config (e.g. `{ url }` override).
 *
 * Response shape:
 * ```json
 * { "data": { ... }, "success": true }
 * ```
 */
export default defineEventHandler(async (event: H3Event) => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const sessionSecret: string | undefined = config.thunderid?.sessionSecret;
  const afterSignInUrl: string = ((config.public.thunderid as any)?.afterSignInUrl as string | undefined) || '/';

  const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();

  // ── Resolve sessionId ─────────────────────────────────────────────────────
  // Priority: live session cookie → temp session cookie → new random id.
  let sessionId: string;

  const liveSession: Awaited<ReturnType<typeof useServerSession>> = await useServerSession(event);
  if (liveSession?.sessionId) {
    sessionId = liveSession.sessionId;
  } else {
    const tempCookie: string | undefined = getCookie(event, getTempSessionCookieName());
    if (tempCookie) {
      try {
        const tempSession: Awaited<ReturnType<typeof verifyTempSessionToken>> = await verifyTempSessionToken(
          tempCookie,
          sessionSecret,
        );
        sessionId = tempSession.sessionId;
      } catch {
        // Expired / tampered — mint a fresh one below.
        sessionId = generateSessionId();
      }
    } else {
      sessionId = generateSessionId();
    }

    // Persist the sessionId in a temp cookie so the callback can look it up.
    const tempToken: string = await createTempSessionToken(sessionId, sessionSecret);
    setCookie(event, getTempSessionCookieName(), tempToken, getTempSessionCookieOptions());
  }

  // ── Parse request body ────────────────────────────────────────────────────
  const body: {payload?: Record<string, unknown>; request?: Record<string, unknown>} = await readBody(event);
  const payload: Record<string, unknown> = body?.payload ?? {};
  const request: Record<string, unknown> = body?.request ?? {};

  // ── Initiate redirect-based sign-in (no payload) ────────────────────────────
  // An embedded (app-native) flow always sends a payload — either `{applicationId, flowType}`
  // to start a new flow, or `{executionId, ...}` to continue one. Only a genuinely empty payload
  // means the caller wants the hosted-page authorize URL for a redirect-based sign-in.
  if (isEmpty(payload)) {
    try {
      const signInUrl: string = await client.getAuthorizeRequestUrl(
        {client_secret: '{{clientSecret}}', response_mode: 'direct'},
        sessionId,
      );
      return {data: {signInUrl}, success: true};
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to build authorize URL: ${err?.message ?? String(err)}`,
      });
    }
  }

  // ── Execute embedded flow step ─────────────────────────────────────────────
  let response: unknown;
  try {
    response = await client.signIn(payload, request, sessionId);
  } catch (err: any) {
    throw createError({
      // Keeps the server's error envelope, so the browser can tell the failures apart, e.g. an expired flow
      // execution.
      data: err?.serverError ? {serverError: err.serverError} : undefined,
      statusCode: 502,
      statusMessage: `Embedded sign-in step failed: ${err?.message ?? String(err)}`,
    });
  }

  // ── Flow complete — establish the session from the flow's JWT assertion ────
  // A completed embedded flow returns a self-contained JWT `assertion` rather than an
  // authorization code to exchange (mirrors how @thunderid/react and @thunderid/vue treat it:
  // the assertion is used directly as the bearer session token).
  if ((response as {flowStatus?: unknown})?.flowStatus === EmbeddedSignInFlowStatus.Complete) {
    const assertion: string | undefined = (response as {assertion?: string})?.assertion;

    if (!assertion) {
      throw createError({statusCode: 502, statusMessage: 'Flow completed without an assertion.'});
    }

    try {
      const idToken: IdToken = await client.getDecodedIdToken(sessionId, assertion);
      const iat: number = typeof idToken.iat === 'number' ? idToken.iat : Math.floor(Date.now() / 1000);
      const exp: number = typeof idToken.exp === 'number' ? idToken.exp : iat + 3600;
      const scope: string = typeof idToken.scope === 'string' ? idToken.scope : '';

      const tokenResponse: TokenResponse = {
        accessToken: assertion,
        createdAt: iat,
        expiresIn: String(Math.max(exp - iat, 0)),
        idToken: assertion,
        refreshToken: '',
        scope,
        tokenType: 'Bearer',
      } as TokenResponse;

      await issueSessionCookie(event, sessionId, tokenResponse, sessionSecret);
      deleteCookie(event, getTempSessionCookieName(), getTempSessionCookieOptions());
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to establish session: ${err?.message ?? String(err)}`,
      });
    }

    return {data: {afterSignInUrl}, success: true};
  }

  // ── Flow incomplete — return step data to the client ──────────────────────
  return {data: response, success: true};
});
