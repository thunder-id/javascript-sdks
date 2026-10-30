// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {EmbeddedSelfServiceFlowResponse, SelfServiceFlowRequestParseResult} from '@thunderid/node';
import {ThunderIDAPIError, parseSelfServiceFlowRequest} from '@thunderid/node';
import {defineEventHandler, readBody, createError} from 'h3';
import type {H3Event} from 'h3';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {verifyAndRehydrateSession} from '../../../utils/serverSession';
import {useRuntimeConfig} from '#imports';

/**
 * POST /api/auth/user/self-service-flow
 *
 * Executes one step of a self-service flow, such as self attribute verification, for the signed-in
 * user, with the access token of the server-held session. Mirrors the
 * `executeSelfServiceFlowAction` Next.js server action.
 *
 * Request body: one flow step (`EmbeddedSelfServiceFlowRequest`). Only the fields of a step are
 * forwarded, so the caller cannot name a user, a session or an application; a new flow must be a
 * `SELF_SERVICE` flow named by its handle.
 *
 * Response: the step (`EmbeddedSelfServiceFlowResponse`). A failure answers with the status of the
 * server's refusal and a fixed message, never the server's reply.
 */
export default defineEventHandler(async (event: H3Event): Promise<EmbeddedSelfServiceFlowResponse> => {
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

  const checked: SelfServiceFlowRequestParseResult = parseSelfServiceFlowRequest(body);
  if ('invalid' in checked) {
    throw createError({statusCode: 400, statusMessage: 'Invalid request body.'});
  }

  try {
    const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
    return await client.executeEmbeddedSelfServiceFlow(checked.request, session.sessionId);
  } catch (error) {
    const statusCode: number | undefined = error instanceof ThunderIDAPIError ? error.statusCode : undefined;
    throw createError({
      statusCode: statusCode && statusCode >= 400 ? statusCode : 502,
      statusMessage: 'Self-service flow request failed.',
    });
  }
});
