// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, getGroupMembers, type GroupMemberListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

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
 * @param groupId - Identifier of the parent resource. Fetching waits until it is defined. A ref or
 * getter refetches when it changes.
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetGroupMembers = (
  groupId: MaybeRefOrGetter<string | undefined>,
  params: MaybeRefOrGetter<UseGetGroupMembersParams> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<GroupMemberListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [GroupQueryKeys.GROUP_MEMBERS, toValue(groupId), {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getGroupMembers({...endpoint, fetcher, limit, offset, groupId: toValue(groupId)!});
    },
    {...options, enabled: () => Boolean(toValue(groupId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetGroupMembers;
