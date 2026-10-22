// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Group, GroupQueryKeys, UpdateGroupRequest, updateGroup} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables for {@link useUpdateGroup}.
 */
export interface UpdateGroupVariables {
  /**
   * The group's new state.
   */
  data: UpdateGroupRequest;
  /**
   * Identifier of the group to update.
   */
  groupId: string;
}

/**
 * Updates a group, then refetches the group, any mounted group lists and membership lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate({groupId, data})` to update.
 */
const useUpdateGroup = (
  options?: ResourceMutationOptions<Group, UpdateGroupVariables>,
): ResourceMutationResult<Group, UpdateGroupVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceMutation(
    ({groupId, data}: UpdateGroupVariables, fetcher) => updateGroup({...endpoint, fetcher, groupId, payload: data}),
    ({groupId}: UpdateGroupVariables) => [
      [GroupQueryKeys.GROUP, groupId],
      [GroupQueryKeys.GROUPS],
      [GroupQueryKeys.MEMBERSHIPS],
    ],
    options,
  );
};

export default useUpdateGroup;
