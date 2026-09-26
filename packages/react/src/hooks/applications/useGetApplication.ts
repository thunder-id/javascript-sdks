// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Application, ApplicationQueryKeys, getApplication} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a single application. Does nothing until `applicationId` is set.
 *
 * @param applicationId - Identifier of the application.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 *
 * @example
 * ```tsx
 * const {data: application} = useGetApplication(applicationId);
 * ```
 */
const useGetApplication = (
  applicationId: string | undefined,
  options?: ResourceQueryOptions,
): ResourceQueryResult<Application> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');

  return useResourceQuery(
    [ApplicationQueryKeys.APPLICATION, applicationId],
    (fetcher) => getApplication({...endpoint, applicationId: applicationId!, fetcher}),
    {...options, enabled: Boolean(applicationId) && options?.enabled !== false},
  );
};

export default useGetApplication;
