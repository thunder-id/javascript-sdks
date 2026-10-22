// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApplicationQueryKeys, getApplications, type ApplicationListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

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
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetApplications = (
  params: MaybeRefOrGetter<UseGetApplicationsParams> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<ApplicationListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [ApplicationQueryKeys.APPLICATIONS, {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getApplications({...endpoint, fetcher, limit, offset});
    },
    options,
  );
};

export default useGetApplications;
