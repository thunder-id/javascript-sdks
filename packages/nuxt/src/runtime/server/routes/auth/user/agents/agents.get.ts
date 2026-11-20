// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type AgentListResponse, PERSONAL_AGENT_KIND, getMeAgents} from '@thunderid/node';
import {createError, defineEventHandler, getQuery} from 'h3';
import type {H3Event} from 'h3';
import handleMeAgentRequest from '../../../../utils/meAgentRoute';

const toCount = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
};

/**
 * GET /api/auth/user/agents
 *
 * Lists a page of the signed-in user's personal agents (`/users/me/agents?kind=personal-assistant`).
 *
 * Query: optional `limit` and `offset`. `400` means a malformed page.
 */
export default defineEventHandler(async (event: H3Event): Promise<AgentListResponse> => {
  const query: Record<string, unknown> = getQuery(event);
  const limit: number | undefined = toCount(query.limit);
  const offset: number | undefined = toCount(query.offset);

  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    throw createError({statusCode: 400, statusMessage: 'Invalid query.'});
  }

  return handleMeAgentRequest(event, (config) => getMeAgents({...config, kind: PERSONAL_AGENT_KIND, limit, offset}));
});
