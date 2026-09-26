// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent, AgentQueryKeys, CreateAgentRequest, createAgent} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates an agent, then refetches any mounted agent lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(payload)` to create.
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
