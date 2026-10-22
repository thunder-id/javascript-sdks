// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, RoleQueryKeys, removeGroupMembers, type Group} from '@thunderid/browser';
import type {GroupMembersVariables} from './useAddGroupMembers';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Removes users, agents or groups from a group, then refetches the group, its members, membership lists
 * and role assignments. Call `mutate({groupId, members})`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
 */
const useRemoveGroupMembers = (
  options?: ResourceMutationOptions<Group, GroupMembersVariables>,
): ResourceMutationResult<Group, GroupMembersVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceMutation(
    ({groupId, members}: GroupMembersVariables, fetcher) =>
      removeGroupMembers({...endpoint, fetcher, groupId, members}),
    ({groupId}: GroupMembersVariables) => [
      [GroupQueryKeys.GROUP, groupId],
      [GroupQueryKeys.GROUP_MEMBERS, groupId],
      [GroupQueryKeys.MEMBERSHIPS],
      [RoleQueryKeys.ROLE_ASSIGNMENTS],
    ],
    options,
  );
};

export default useRemoveGroupMembers;
