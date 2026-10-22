// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentQueryKeys, deleteAgent} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Deletes an agent, then refetches any mounted agent lists. Call `mutate(agentId)` to delete.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
 */
const useDeleteAgent = (options?: ResourceMutationOptions<void, string>): ResourceMutationResult<void, string> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceMutation(
    (agentId: string, fetcher) => deleteAgent({...endpoint, agentId, fetcher}),
    () => [[AgentQueryKeys.AGENTS]],
    options,
  );
};

export default useDeleteAgent;
