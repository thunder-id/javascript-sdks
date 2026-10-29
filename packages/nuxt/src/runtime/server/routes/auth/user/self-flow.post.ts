// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {EmbeddedSelfFlowResponse, SelfFlowRequestParseResult} from '@thunderid/node';
import {ThunderIDAPIError, parseSelfFlowRequest} from '@thunderid/node';
import {defineEventHandler, readBody, createError} from 'h3';
import type {H3Event} from 'h3';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {verifyAndRehydrateSession} from '../../../utils/serverSession';
import {useRuntimeConfig} from '#imports';

/**
 * POST /api/auth/user/self-flow
 *
 * Executes one step of a `SELF` flow, such as self attribute verification, for the signed-in
 * user, with the access token of the server-held session. Mirrors the
 * `executeSelfFlowAction` Next.js server action.
 *
 * Request body: one flow step (`EmbeddedSelfFlowRequest`). Only the fields of a step are
 * forwarded, so the caller cannot name a user, a session or an application; a new flow must be a
 * `SELF` flow named by its handle.
 *
 * Response: the step (`EmbeddedSelfFlowResponse`). A failure answers with the status of the
 * server's refusal and a fixed message, never the server's reply.
 */
export default defineEventHandler(async (event: H3Event): Promise<EmbeddedSelfFlowResponse> => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const sessionSecret: string | undefined = config.thunderid?.sessionSecret;

  const session: Awaited<ReturnType<typeof verifyAndRehydrateSession>> = await verifyAndRehydrateSession(
    event,
    sessionSecret,
  );
  if (!session) {
    throw createError({statusCode: 401, statusMessage: 'Unauthorized: Invalid or expired session.'});
  }

  let body: unknown;
  try {
    body = await readBody(event);
  } catch {
    throw createError({statusCode: 400, statusMessage: 'Invalid request body.'});
  }

  const checked: SelfFlowRequestParseResult = parseSelfFlowRequest(body);
  if ('invalid' in checked) {
    throw createError({statusCode: 400, statusMessage: 'Invalid request body.'});
  }

  try {
    const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
    return await client.executeEmbeddedSelfFlow(checked.request, session.sessionId);
  } catch (error) {
    const statusCode: number | undefined = error instanceof ThunderIDAPIError ? error.statusCode : undefined;
    throw createError({
      statusCode: statusCode && statusCode >= 400 ? statusCode : 502,
      statusMessage: 'SELF flow request failed.',
    });
  }
});
