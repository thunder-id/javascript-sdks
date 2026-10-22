// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentQueryKeys, getAgent, type Agent} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a single agent. Does nothing until `agentId` is set.
 *
 * @param agentId - Identifier of the resource. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetAgent = (
  agentId: MaybeRefOrGetter<string | undefined>,
  options?: ResourceQueryOptions,
): ResourceQueryResult<Agent> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceQuery(
    () => [AgentQueryKeys.AGENT, toValue(agentId)],
    (fetcher) => getAgent({...endpoint, fetcher, agentId: toValue(agentId)!}),
    {...options, enabled: () => Boolean(toValue(agentId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetAgent;
