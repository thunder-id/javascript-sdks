// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApplicationQueryKeys, getApplication, type Application} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a single application. Does nothing until `applicationId` is set.
 *
 * @param applicationId - Identifier of the resource. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetApplication = (
  applicationId: MaybeRefOrGetter<string | undefined>,
  options?: ResourceQueryOptions,
): ResourceQueryResult<Application> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');

  return useResourceQuery(
    () => [ApplicationQueryKeys.APPLICATION, toValue(applicationId)],
    (fetcher) => getApplication({...endpoint, fetcher, applicationId: toValue(applicationId)!}),
    {...options, enabled: () => Boolean(toValue(applicationId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetApplication;
