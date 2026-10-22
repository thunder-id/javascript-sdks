// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, RoleQueryKeys, deleteGroup} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Deletes a group, then refetches group lists, membership lists and role assignments, since members
 * lose the roles the group carried. Call `mutate(groupId)`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
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
