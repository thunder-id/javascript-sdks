// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, createGroup, type CreateGroupRequest, type Group} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates a group, then refetches any mounted group lists and membership lists. Call `mutate(payload)`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
 */
const useCreateGroup = (
  options?: ResourceMutationOptions<Group, CreateGroupRequest>,
): ResourceMutationResult<Group, CreateGroupRequest> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceMutation(
    (payload: CreateGroupRequest, fetcher) => createGroup({...endpoint, fetcher, payload}),
    () => [[GroupQueryKeys.GROUPS], [GroupQueryKeys.MEMBERSHIPS]],
    options,
  );
};

export default useCreateGroup;
