// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentListResponse} from '../../models/agent-resource';
import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getAgents request.
 */
export type GetAgentsConfig = ManagementRequestConfig & Pick<ApiFilteringParams, 'limit' | 'offset'>;

/**
 * Retrieves a page of agents.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page of agents.
 *
 * @example
 * ```typescript
 * const {agents, totalResults} = await getAgents({
 *   baseUrl: 'https://localhost:8090',
 *   limit: 10,
 * });
 * ```
 */
const getAgents = async ({limit, offset, ...config}: GetAgentsConfig): Promise<AgentListResponse> =>
  requestManagementResource<AgentListResponse>(config, {
    collection: 'agents',
    failureMessage: 'Failed to fetch agents',
    method: 'GET',
    operation: 'getAgents',
    query: {include: 'display', limit, offset},
  });

export default getAgents;
