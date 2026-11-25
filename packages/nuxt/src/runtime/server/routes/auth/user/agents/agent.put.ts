// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Agent, type UpdateMeAgentRequest, parseUpdateMeAgentRequest, updateMeAgent} from '@thunderid/node';
import {createError, defineEventHandler, readBody} from 'h3';
import type {H3Event} from 'h3';
import handleMeAgentRequest, {requireAgentId} from '../../../../utils/meAgentRoute';

/**
 * PUT /api/auth/user/agents/:id
 *
 * Replaces the part of one of the signed-in user's agents its owner may change. Only `attributes`, `description`,
 * `grantTypes` and `redirectUris` are taken from the body; `400` means a body of the wrong shape.
 */
export default defineEventHandler(async (event: H3Event): Promise<Agent> => {
  const agentId: string = requireAgentId(event);
  let payload: UpdateMeAgentRequest | undefined;

  try {
    payload = parseUpdateMeAgentRequest(await readBody(event));
  } catch {
    payload = undefined;
  }

  if (!payload) {
    throw createError({statusCode: 400, statusMessage: 'Invalid request body.'});
  }

  const update: UpdateMeAgentRequest = payload;

  return handleMeAgentRequest(event, (config) => updateMeAgent({...config, agentId, payload: update}));
});
