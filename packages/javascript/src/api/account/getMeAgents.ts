// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentKind, AgentListResponse} from '../../models/agent-resource';
import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getMeAgents request.
 */
export type GetMeAgentsConfig = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Lists only the agents of this kind. Without it, every agent the signed-in user owns is listed.
     */
    kind?: AgentKind;
  };

/**
 * Retrieves a page of the agents the signed-in user owns, in the organization unit the access token names.
 * The token must be the user's own: a delegated token, such as an agent's token for its owner, is refused.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page of agents.
 *
 * @example
 * ```typescript
 * const {agents, totalResults} = await getMeAgents({
 *   baseUrl: 'https://localhost:8090',
 *   kind: PERSONAL_AGENT_KIND,
 *   limit: 10,
 * });
 * ```
 */
const getMeAgents = async ({kind, limit, offset, ...config}: GetMeAgentsConfig): Promise<AgentListResponse> =>
  requestManagementResource<AgentListResponse>(config, {
    collection: 'users/me/agents',
    failureMessage: 'Failed to fetch your agents',
    method: 'GET',
    operation: 'getMeAgents',
    query: {kind, limit, offset},
  });

export default getMeAgents;
