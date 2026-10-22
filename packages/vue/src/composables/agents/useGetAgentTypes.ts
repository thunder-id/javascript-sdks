// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentQueryKeys, getAgentTypes, type AgentTypeListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of agent types.
 *
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetAgentTypes = (
  params: MaybeRefOrGetter<{limit?: number; offset?: number}> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<AgentTypeListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agentTypes');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [AgentQueryKeys.AGENT_TYPES, {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getAgentTypes({...endpoint, fetcher, limit, offset});
    },
    options,
  );
};

export default useGetAgentTypes;
