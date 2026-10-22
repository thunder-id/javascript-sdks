// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, getGroups, type GroupListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Parameters for {@link useGetGroups}.
 */
export interface UseGetGroupsParams {
  limit?: number;
  offset?: number;
}

/**
 * Fetches a page of groups.
 *
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetGroups = (
  params: MaybeRefOrGetter<UseGetGroupsParams> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<GroupListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [GroupQueryKeys.GROUPS, {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getGroups({...endpoint, fetcher, limit, offset});
    },
    options,
  );
};

export default useGetGroups;
