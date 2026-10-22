// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, getUserGroups, type MembershipGroupListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of the groups a user belongs to.
 *
 * @param userId - Identifier of the parent resource. Fetching waits until it is defined. A ref or
 * getter refetches when it changes.
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetUserGroups = (
  userId: MaybeRefOrGetter<string | undefined>,
  params: MaybeRefOrGetter<{limit?: number; offset?: number}> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<MembershipGroupListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [GroupQueryKeys.MEMBERSHIPS, 'user', toValue(userId), {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getUserGroups({...endpoint, fetcher, limit, offset, userId: toValue(userId)!});
    },
    {...options, enabled: () => Boolean(toValue(userId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetUserGroups;
