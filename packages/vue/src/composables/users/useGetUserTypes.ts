// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {UserQueryKeys, getUserTypes, type ManagedUserTypeListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of user types.
 *
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetUserTypes = (
  params: MaybeRefOrGetter<{limit?: number; offset?: number}> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<ManagedUserTypeListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('userTypes');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [UserQueryKeys.USER_TYPES, {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getUserTypes({...endpoint, fetcher, limit, offset});
    },
    options,
  );
};

export default useGetUserTypes;
