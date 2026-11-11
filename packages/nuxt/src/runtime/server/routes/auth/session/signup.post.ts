// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedSignUpFlowStatus} from '@thunderid/node';
import {defineEventHandler, readBody, createError} from 'h3';
import type {H3Event} from 'h3';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {useRuntimeConfig} from '#imports';

function hasFlowStatus(value: unknown): value is {flowStatus?: EmbeddedSignUpFlowStatus} {
  return typeof value === 'object' && value !== null && 'flowStatus' in value;
}

/**
 * POST /api/auth/signup
 *
 * Handles embedded (app-native) sign-up flow steps.
 *
 * Request body:
 * - `payload` — the embedded sign-up flow step payload (`EmbeddedFlowExecuteRequestPayload`).
 *   When omitted, returns an empty `signUpUrl` (caller should redirect to the sign-up page).
 *
 * Response shape:
 * ```json
 * { "data": { ... }, "success": true }
 * ```
 */
export default defineEventHandler(async (event: H3Event) => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  // Mirror Next.js: after-sign-up redirect reuses the configured `afterSignInUrl`
  // (the user typically signs in immediately after registering).
  const afterSignUpUrl: string = ((config.public.thunderid as any)?.afterSignInUrl as string | undefined) || '/';

  // ── Parse request body ────────────────────────────────────────────────────
  const body: {payload?: Record<string, unknown>} = await readBody(event);
  const payload: Record<string, unknown> | undefined = body?.payload;

  // No payload — return an empty signUpUrl so the client can redirect.
  if (!payload) {
    return {data: {signUpUrl: ''}, success: true};
  }

  // ── Execute embedded sign-up flow step ────────────────────────────────────
  const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();

  let response: unknown;
  try {
    response = await client.signUp(payload as any);
  } catch (err: any) {
    throw createError({
      // Keeps the server's error envelope, so the browser can tell the failures apart, e.g. an expired flow
      // execution.
      data: err?.serverError ? {serverError: err.serverError} : undefined,
      statusCode: 502,
      statusMessage: `Embedded sign-up step failed: ${err?.message ?? String(err)}`,
    });
  }

  // ── Flow complete ─────────────────────────────────────────────────────────
  if (hasFlowStatus(response) && response.flowStatus === EmbeddedSignUpFlowStatus.Complete) {
    return {data: {afterSignUpUrl}, success: true};
  }

  // ── Flow incomplete — return step data to the client ──────────────────────
  return {data: response, success: true};
});
