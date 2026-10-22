// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {UserQueryKeys, getUsers, type ApiFilteringParams, type ManagedUserListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of users.
 *
 * @param params - Pagination and filter parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 *
 * @example
 * ```ts
 * const {data, isLoading} = useGetUsers({limit: 20, filter: 'username sw "a"'});
 * ```
 */
const useGetUsers = (
  params: MaybeRefOrGetter<ApiFilteringParams> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<ManagedUserListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceQuery(
    () => {
      const {filter, limit, offset} = toValue(params);

      return [UserQueryKeys.USERS, {filter, limit, offset}];
    },
    (fetcher) => {
      const {filter, limit, offset} = toValue(params);

      return getUsers({...endpoint, fetcher, filter, limit, offset});
    },
    options,
  );
};

export default useGetUsers;
