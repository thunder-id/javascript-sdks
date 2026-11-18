// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {deleteMeAgent} from '@thunderid/node';
import {defineEventHandler} from 'h3';
import type {H3Event} from 'h3';
import handleMeAgentRequest, {requireAgentId} from '../../../../utils/meAgentRoute';

/**
 * DELETE /api/auth/user/agents/:id
 *
 * Deletes one of the signed-in user's agents.
 * The server answers only for an agent the user owns. Responds with no content.
 */
export default defineEventHandler(async (event: H3Event): Promise<void> => {
  const agentId: string = requireAgentId(event);

  await handleMeAgentRequest(event, (config) => deleteMeAgent({...config, agentId}));
});
