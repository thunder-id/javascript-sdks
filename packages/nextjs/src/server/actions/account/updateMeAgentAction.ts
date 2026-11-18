// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {Agent, UpdateMeAgentRequest, parseUpdateMeAgentRequest, updateMeAgent} from '@thunderid/node';
import runMeAgentRequest, {MeAgentActionResult, isAgentId} from './runMeAgentRequest';

/**
 * Replaces the part of one of the signed-in user's agents its owner may change, with the session's access token,
 * which stays on the server. Only the agent's identifier and the owner-editable fields are taken from the caller.
 */
const updateMeAgentAction = async (
  agentId: string,
  payload: UpdateMeAgentRequest,
): Promise<MeAgentActionResult<Agent>> => {
  const request: UpdateMeAgentRequest | undefined = parseUpdateMeAgentRequest(payload);

  if (!isAgentId(agentId) || !request) {
    return {statusCode: 400, success: false};
  }

  return runMeAgentRequest((config) => updateMeAgent({...config, agentId, payload: request}));
};

export default updateMeAgentAction;
