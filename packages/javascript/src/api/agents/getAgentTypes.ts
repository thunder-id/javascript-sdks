// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentTypeListResponse} from '../../models/agent-resource';
import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getAgentTypes request.
 */
export type GetAgentTypesConfig = ManagementRequestConfig & Pick<ApiFilteringParams, 'limit' | 'offset'>;

/**
 * Retrieves a page of agent types.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {types} = await getAgentTypes({baseUrl: 'https://localhost:8090'});
 * ```
 */
const getAgentTypes = async ({limit, offset, ...config}: GetAgentTypesConfig): Promise<AgentTypeListResponse> =>
  requestManagementResource<AgentTypeListResponse>(config, {
    collection: 'agent-types',
    failureMessage: 'Failed to fetch agent types',
    method: 'GET',
    operation: 'getAgentTypes',
    query: {limit, offset},
  });

export default getAgentTypes;
