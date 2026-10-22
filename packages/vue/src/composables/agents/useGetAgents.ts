// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentQueryKeys, getAgents, type AgentListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Parameters for {@link useGetAgents}.
 */
export interface UseGetAgentsParams {
  /**
   * Server-side filter on an agent attribute, for example `name eq "Calendar Agent"`.
   */
  filter?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetches a page of agents.
 *
 * @param params - Pagination and filter parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetAgents = (
  params: MaybeRefOrGetter<UseGetAgentsParams> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<AgentListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceQuery(
    () => {
      const {filter, limit, offset} = toValue(params);

      return [AgentQueryKeys.AGENTS, {filter, limit, offset}];
    },
    (fetcher) => {
      const {filter, limit, offset} = toValue(params);

      return getAgents({...endpoint, fetcher, filter, limit, offset});
    },
    options,
  );
};

export default useGetAgents;
