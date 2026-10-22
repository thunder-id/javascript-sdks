// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, RoleQueryKeys, deleteGroup} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Deletes a group, then refetches group lists, membership lists and role assignments, since members lose the roles the group carried.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(groupId)` to delete.
 */
const useDeleteGroup = (options?: ResourceMutationOptions<void, string>): ResourceMutationResult<void, string> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceMutation(
    (groupId: string, fetcher) => deleteGroup({...endpoint, fetcher, groupId}),
    () => [[GroupQueryKeys.GROUPS], [GroupQueryKeys.MEMBERSHIPS], [RoleQueryKeys.ROLE_ASSIGNMENTS]],
    options,
  );
};

export default useDeleteGroup;
