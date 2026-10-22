// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import {MembershipGroupListResponse} from '../../models/group';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getAgentGroups request.
 */
export type GetAgentGroupsConfig = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Identifier of the agent whose groups to list.
     */
    agentId: string;
  };

/**
 * Retrieves a page of the groups an agent belongs to.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {groups} = await getAgentGroups({baseUrl: 'https://localhost:8090', agentId});
 * ```
 */
const getAgentGroups = async ({
  agentId,
  limit,
  offset,
  ...config
}: GetAgentGroupsConfig): Promise<MembershipGroupListResponse> =>
  requestManagementResource<MembershipGroupListResponse>(config, {
    collection: 'agents',
    failureMessage: 'Failed to fetch agent groups',
    id: agentId,
    method: 'GET',
    operation: 'getAgentGroups',
    query: {limit, offset},
    subPath: 'groups',
  });

export default getAgentGroups;
