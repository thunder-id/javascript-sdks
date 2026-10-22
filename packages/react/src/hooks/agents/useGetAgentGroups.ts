// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, MembershipGroupListResponse, getAgentGroups} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of the groups an agent belongs to.
 *
 * @param agentId - Identifier of the agent. Fetching waits until it is defined.
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetAgentGroups = (
  agentId: string | undefined,
  {limit, offset}: {limit?: number; offset?: number} = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<MembershipGroupListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceQuery(
    [GroupQueryKeys.MEMBERSHIPS, 'agent', agentId, {limit, offset}],
    (fetcher) => getAgentGroups({...endpoint, fetcher, limit, offset, agentId: agentId!}),
    {...options, enabled: Boolean(agentId) && options?.enabled !== false},
  );
};

export default useGetAgentGroups;
