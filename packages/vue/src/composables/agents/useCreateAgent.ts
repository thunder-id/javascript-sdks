// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentQueryKeys, createAgent, type Agent, type CreateAgentRequest} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates an agent, then refetches any mounted agent lists. Call `mutate(payload)`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
 */
const useCreateAgent = (
  options?: ResourceMutationOptions<Agent, CreateAgentRequest>,
): ResourceMutationResult<Agent, CreateAgentRequest> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceMutation(
    (payload: CreateAgentRequest, fetcher) => createAgent({...endpoint, fetcher, payload}),
    () => [[AgentQueryKeys.AGENTS]],
    options,
  );
};

export default useCreateAgent;
