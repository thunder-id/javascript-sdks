// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, MembershipGroupListResponse, getUserGroups} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of the groups a user belongs to.
 *
 * @param userId - Identifier of the user. Fetching waits until it is defined.
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetUserGroups = (
  userId: string | undefined,
  {limit, offset}: {limit?: number; offset?: number} = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<MembershipGroupListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceQuery(
    [GroupQueryKeys.MEMBERSHIPS, 'user', userId, {limit, offset}],
    (fetcher) => getUserGroups({...endpoint, fetcher, limit, offset, userId: userId!}),
    {...options, enabled: Boolean(userId) && options?.enabled !== false},
  );
};

export default useGetUserGroups;
