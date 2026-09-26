// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent, AgentQueryKeys, getAgent} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a single agent. Does nothing until `agentId` is set.
 *
 * @param agentId - Identifier of the agent.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetAgent = (agentId: string | undefined, options?: ResourceQueryOptions): ResourceQueryResult<Agent> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceQuery(
    [AgentQueryKeys.AGENT, agentId],
    (fetcher) => getAgent({...endpoint, agentId: agentId!, fetcher}),
    {...options, enabled: Boolean(agentId) && options?.enabled !== false},
  );
};

export default useGetAgent;
