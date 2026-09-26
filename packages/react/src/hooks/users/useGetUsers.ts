// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagedUserListResponse, UserQueryKeys, getUsers} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of users.
 *
 * @param params - Pagination and filter parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 *
 * @example
 * ```tsx
 * const {data, isLoading} = useGetUsers({limit: 20, filter: 'username sw "a"'});
 * ```
 */
const useGetUsers = (
  {filter, limit, offset}: ApiFilteringParams = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<ManagedUserListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceQuery(
    [UserQueryKeys.USERS, {filter, limit, offset}],
    (fetcher) => getUsers({...endpoint, fetcher, filter, limit, offset}),
    options,
  );
};

export default useGetUsers;
