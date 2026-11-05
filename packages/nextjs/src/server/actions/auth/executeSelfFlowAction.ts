// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {
  EmbeddedSelfFlowResponse,
  SelfFlowRequestParseResult,
  ThunderIDAPIError,
  parseSelfFlowRequest,
} from '@thunderid/node';
import getClient from '../../getClient';
import getSessionId from '../getSessionId';

export type ExecuteSelfFlowActionResult =
  | {data: EmbeddedSelfFlowResponse; success: true}
  | {statusCode?: number; success: false};

/**
 * Executes one step of a `SELF` flow, such as self attribute verification, for the signed-in
 * user, with the access token of the server-held session. The request carries no session ID, token
 * or user ID: the session comes from the request cookie, and only the fields of a step are forwarded.
 * A new flow must be a `SELF` flow named by its handle.
 *
 * Never throws across the server action boundary. A failure carries only its HTTP status, never the
 * reply of the server, which the browser reports as a refusal.
 */
const executeSelfFlowAction = async (request: unknown): Promise<ExecuteSelfFlowActionResult> => {
  const sessionId: string | undefined = await getSessionId();

  if (!sessionId) {
    return {statusCode: 401, success: false};
  }

  const checked: SelfFlowRequestParseResult = parseSelfFlowRequest(request);

  if ('invalid' in checked) {
    return {statusCode: 400, success: false};
  }

  try {
    const data: EmbeddedSelfFlowResponse = await getClient().executeEmbeddedSelfFlow(checked.request, sessionId);

    return {data, success: true};
  } catch (error) {
    return error instanceof ThunderIDAPIError && error.statusCode
      ? {statusCode: error.statusCode, success: false}
      : {success: false};
  }
};

export default executeSelfFlowAction;
