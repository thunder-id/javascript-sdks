// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentQueryKeys, AgentTypeListResponse, getAgentTypes} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of agent types.
 *
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetAgentTypes = (
  {limit, offset}: {limit?: number; offset?: number} = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<AgentTypeListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agentTypes');

  return useResourceQuery(
    [AgentQueryKeys.AGENT_TYPES, {limit, offset}],
    (fetcher) => getAgentTypes({...endpoint, fetcher, limit, offset}),
    options,
  );
};

export default useGetAgentTypes;
