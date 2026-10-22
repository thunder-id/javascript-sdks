// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentRoleListResponse} from '../../models/agent-resource';
import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getAgentRoles request.
 */
export type GetAgentRolesConfig = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Identifier of the agent whose roles to list.
     */
    agentId: string;
  };

/**
 * Retrieves a page of the role names assigned to an agent, directly or through its groups.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {roles} = await getAgentRoles({baseUrl: 'https://localhost:8090', agentId});
 * ```
 */
const getAgentRoles = async ({
  agentId,
  limit,
  offset,
  ...config
}: GetAgentRolesConfig): Promise<AgentRoleListResponse> =>
  requestManagementResource<AgentRoleListResponse>(config, {
    collection: 'agents',
    failureMessage: 'Failed to fetch agent roles',
    id: agentId,
    method: 'GET',
    operation: 'getAgentRoles',
    query: {limit, offset},
    subPath: 'roles',
  });

export default getAgentRoles;
