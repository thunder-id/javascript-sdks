// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {AgentListResponse, PERSONAL_AGENT_KIND, getMeAgents} from '@thunderid/node';
import runMeAgentRequest, {MeAgentActionResult} from './runMeAgentRequest';

const toCount = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;

/**
 * Lists a page of the signed-in user's personal agents (`/users/me/agents?kind=personal-assistant`) with the
 * session's access token, which stays on the server. Only `limit` and `offset` are taken from the caller.
 */
const getMeAgentsAction = async ({limit, offset}: {limit?: number; offset?: number} = {}): Promise<
  MeAgentActionResult<AgentListResponse>
> =>
  runMeAgentRequest((config) =>
    getMeAgents({...config, kind: PERSONAL_AGENT_KIND, limit: toCount(limit), offset: toCount(offset)}),
  );

export default getMeAgentsAction;
