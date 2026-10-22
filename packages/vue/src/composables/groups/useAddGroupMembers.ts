// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, RoleQueryKeys, addGroupMembers, type Group, type GroupMember} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables for {@link useAddGroupMembers} and {@link useRemoveGroupMembers}.
 */
export interface GroupMembersVariables {
  /**
   * Identifier of the group.
   */
  groupId: string;
  /**
   * The identities to change.
   */
  members: Pick<GroupMember, 'id' | 'type'>[];
}

/**
 * Adds users, agents or groups to a group, then refetches the group, its members, membership lists and
 * role assignments, since membership changes the roles a member inherits. Call `mutate({groupId, members})`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
 */
const useAddGroupMembers = (
  options?: ResourceMutationOptions<Group, GroupMembersVariables>,
): ResourceMutationResult<Group, GroupMembersVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceMutation(
    ({groupId, members}: GroupMembersVariables, fetcher) => addGroupMembers({...endpoint, fetcher, groupId, members}),
    ({groupId}: GroupMembersVariables) => [
      [GroupQueryKeys.GROUP, groupId],
      [GroupQueryKeys.GROUP_MEMBERS, groupId],
      [GroupQueryKeys.MEMBERSHIPS],
      [RoleQueryKeys.ROLE_ASSIGNMENTS],
    ],
    options,
  );
};

export default useAddGroupMembers;
