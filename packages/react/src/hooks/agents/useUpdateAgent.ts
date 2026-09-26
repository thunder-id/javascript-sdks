// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent, AgentQueryKeys, UpdateAgentRequest, updateAgent} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables accepted by {@link useUpdateAgent}'s `mutate`.
 */
export interface UpdateAgentVariables {
  agentId: string;
  data: UpdateAgentRequest;
}

/**
 * Updates an agent, then refetches it and any mounted agent lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate({agentId, data})` to update.
 */
const useUpdateAgent = (
  options?: ResourceMutationOptions<Agent, UpdateAgentVariables>,
): ResourceMutationResult<Agent, UpdateAgentVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceMutation(
    ({agentId, data}: UpdateAgentVariables, fetcher) => updateAgent({...endpoint, agentId, fetcher, payload: data}),
    ({agentId}: UpdateAgentVariables) => [[AgentQueryKeys.AGENT, agentId], [AgentQueryKeys.AGENTS]],
    options,
  );
};

export default useUpdateAgent;
