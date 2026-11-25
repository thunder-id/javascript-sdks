// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {deleteMeAgent} from '@thunderid/node';
import runMeAgentRequest, {MeAgentActionResult, isAgentId} from './runMeAgentRequest';

/**
 * Deletes one of the signed-in user's agents with the session's access token, which stays on the server. Only the agent's identifier is taken from the
 * caller, and the server answers only for an agent the user owns.
 */
const deleteMeAgentAction = async (agentId: string): Promise<MeAgentActionResult<void>> => {
  if (!isAgentId(agentId)) {
    return {statusCode: 400, success: false};
  }

  return runMeAgentRequest((config) => deleteMeAgent({...config, agentId}));
};

export default deleteMeAgentAction;
