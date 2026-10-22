// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagedUserTypeListResponse, UserQueryKeys, getUserTypes} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of user types.
 *
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetUserTypes = (
  {limit, offset}: {limit?: number; offset?: number} = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<ManagedUserTypeListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('userTypes');

  return useResourceQuery(
    [UserQueryKeys.USER_TYPES, {limit, offset}],
    (fetcher) => getUserTypes({...endpoint, fetcher, limit, offset}),
    options,
  );
};

export default useGetUserTypes;
