// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {
  EmbeddedSelfServiceFlowResponse,
  SelfServiceFlowRequestParseResult,
  ThunderIDAPIError,
  parseSelfServiceFlowRequest,
} from '@thunderid/node';
import getClient from '../../getClient';
import getSessionId from '../getSessionId';

export type ExecuteSelfServiceFlowActionResult =
  | {data: EmbeddedSelfServiceFlowResponse; success: true}
  | {statusCode?: number; success: false};

/**
 * Executes one step of a self-service flow, such as self attribute verification, for the signed-in
 * user, with the access token of the server-held session. The request carries no session ID, token
 * or user ID: the session comes from the request cookie, and only the fields of a step are forwarded.
 * A new flow must be a `SELF_SERVICE` flow named by its handle.
 *
 * Never throws across the server action boundary. A failure carries only its HTTP status, never the
 * reply of the server, which the browser reports as a refusal.
 */
const executeSelfServiceFlowAction = async (request: unknown): Promise<ExecuteSelfServiceFlowActionResult> => {
  const sessionId: string | undefined = await getSessionId();

  if (!sessionId) {
    return {statusCode: 401, success: false};
  }

  const checked: SelfServiceFlowRequestParseResult = parseSelfServiceFlowRequest(request);

  if ('invalid' in checked) {
    return {statusCode: 400, success: false};
  }

  try {
    const data: EmbeddedSelfServiceFlowResponse = await getClient().executeEmbeddedSelfServiceFlow(
      checked.request,
      sessionId,
    );

    return {data, success: true};
  } catch (error) {
    return error instanceof ThunderIDAPIError && error.statusCode
      ? {statusCode: error.statusCode, success: false}
      : {success: false};
  }
};

export default executeSelfServiceFlowAction;
