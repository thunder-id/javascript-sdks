// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApplicationListResponse, ApplicationQueryKeys, getApplications} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Parameters for {@link useGetApplications}.
 */
export interface UseGetApplicationsParams {
  limit?: number;
  offset?: number;
}

/**
 * Fetches a page of applications.
 *
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 *
 * @example
 * ```tsx
 * const {data, isLoading, error} = useGetApplications({limit: 10});
 * ```
 */
const useGetApplications = (
  {limit, offset}: UseGetApplicationsParams = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<ApplicationListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');

  return useResourceQuery(
    [ApplicationQueryKeys.APPLICATIONS, {limit, offset}],
    (fetcher) => getApplications({...endpoint, fetcher, limit, offset}),
    options,
  );
};

export default useGetApplications;
