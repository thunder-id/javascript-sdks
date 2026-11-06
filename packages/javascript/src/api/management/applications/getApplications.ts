// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../../models/api';
import {ApplicationListResponse} from '../../../models/application';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getApplications request.
 */
export type GetApplicationsConfig = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Lists the applications the project's root organization unit owns, followed by the ones shared
     * into it. Served by the control plane.
     */
    projectId?: string;
  };

/**
 * Retrieves a page of applications.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page of applications.
 *
 * @example
 * ```typescript
 * const {applications, totalResults} = await getApplications({
 *   baseUrl: 'https://localhost:8090',
 *   limit: 10,
 *   offset: 0,
 * });
 * ```
 */
const getApplications = async ({
  limit,
  offset,
  projectId,
  ...config
}: GetApplicationsConfig): Promise<ApplicationListResponse> =>
  requestManagementResource<ApplicationListResponse>(config, {
    collection: 'applications',
    failureMessage: 'Failed to fetch applications',
    method: 'GET',
    operation: 'getApplications',
    query: {limit, offset, projectId},
  });

export default getApplications;
