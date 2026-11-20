// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Agent, getMeAgent} from '@thunderid/node';
import {defineEventHandler} from 'h3';
import type {H3Event} from 'h3';
import handleMeAgentRequest, {requireAgentId} from '../../../../utils/meAgentRoute';

/**
 * GET /api/auth/user/agents/:id
 *
 * Reads one of the signed-in user's agents. The server answers only for an agent the user owns.
 */
export default defineEventHandler(async (event: H3Event): Promise<Agent> => {
  const agentId: string = requireAgentId(event);

  return handleMeAgentRequest(event, (config) => getMeAgent({...config, agentId}));
});
