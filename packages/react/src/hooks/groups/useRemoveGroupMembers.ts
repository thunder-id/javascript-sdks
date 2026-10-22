// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Group, GroupQueryKeys, RoleQueryKeys, removeGroupMembers} from '@thunderid/browser';
import {GroupMembersVariables} from './useAddGroupMembers';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Removes users, agents or groups from a group, then refetches the group, its members, membership lists and role assignments, since membership changes the roles a member inherits.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate({groupId, members})`.
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
