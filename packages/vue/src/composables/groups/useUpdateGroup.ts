// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, type Group, type UpdateGroupRequest, updateGroup} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

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
 * Updates a group, then refetches the group, any mounted group lists and membership lists. Call
 * `mutate({groupId, data})`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
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
