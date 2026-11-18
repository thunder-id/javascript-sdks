// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {unsuspendMeAgent} from '@thunderid/node';
import runMeAgentRequest, {MeAgentActionResult, isAgentId} from './runMeAgentRequest';

/**
 * Lifts the owner's suspension of one of the signed-in user's agents with the session's access token, which stays on the server. Only the agent's identifier is taken from the
 * caller, and the server answers only for an agent the user owns.
 */
const unsuspendMeAgentAction = async (agentId: string): Promise<MeAgentActionResult<void>> => {
  if (!isAgentId(agentId)) {
    return {statusCode: 400, success: false};
  }

  return runMeAgentRequest((config) => unsuspendMeAgent({...config, agentId}));
};

export default unsuspendMeAgentAction;
