// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CreateGroupRequest, Group, GroupQueryKeys, createGroup} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates a group, then refetches any mounted group lists and membership lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(payload)` to create.
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
