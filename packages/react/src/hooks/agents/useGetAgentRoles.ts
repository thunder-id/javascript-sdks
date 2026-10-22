// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentRoleListResponse, RoleQueryKeys, getAgentRoles} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of the role names assigned to an agent, directly or through its groups. Refetches
 * whenever a role assignment or a group membership changes.
 *
 * @param agentId - Identifier of the agent. Fetching waits until it is defined.
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetAgentRoles = (
  agentId: string | undefined,
  {limit, offset}: {limit?: number; offset?: number} = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<AgentRoleListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceQuery(
    [RoleQueryKeys.ROLE_ASSIGNMENTS, 'agent', agentId, {limit, offset}],
    (fetcher) => getAgentRoles({...endpoint, agentId: agentId!, fetcher, limit, offset}),
    {...options, enabled: Boolean(agentId) && options?.enabled !== false},
  );
};

export default useGetAgentRoles;
