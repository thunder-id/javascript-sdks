// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupListResponse, GroupQueryKeys, getGroups} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

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
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetGroups = (
  {limit, offset}: UseGetGroupsParams = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<GroupListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceQuery(
    [GroupQueryKeys.GROUPS, {limit, offset}],
    (fetcher) => getGroups({...endpoint, fetcher, limit, offset}),
    options,
  );
};

export default useGetGroups;
