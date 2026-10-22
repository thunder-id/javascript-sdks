// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupMemberListResponse, GroupQueryKeys, getGroupMembers} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Pagination parameters for {@link useGetGroupMembers}.
 */
export interface UseGetGroupMembersParams {
  limit?: number;
  offset?: number;
}

/**
 * Fetches a page of the users, agents and groups in a group.
 *
 * @param groupId - Identifier of the group. Fetching waits until it is defined.
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetGroupMembers = (
  groupId: string | undefined,
  {limit, offset}: UseGetGroupMembersParams = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<GroupMemberListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceQuery(
    [GroupQueryKeys.GROUP_MEMBERS, groupId, {limit, offset}],
    (fetcher) => getGroupMembers({...endpoint, fetcher, limit, offset, groupId: groupId!}),
    {...options, enabled: Boolean(groupId) && options?.enabled !== false},
  );
};

export default useGetGroupMembers;
