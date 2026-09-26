// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentListResponse, AgentQueryKeys, getAgents} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Parameters for {@link useGetAgents}.
 */
export interface UseGetAgentsParams {
  limit?: number;
  offset?: number;
}

/**
 * Fetches a page of agents.
 *
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetAgents = (
  {limit, offset}: UseGetAgentsParams = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<AgentListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceQuery(
    [AgentQueryKeys.AGENTS, {limit, offset}],
    (fetcher) => getAgents({...endpoint, fetcher, limit, offset}),
    options,
  );
};

export default useGetAgents;
