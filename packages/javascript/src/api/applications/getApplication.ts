// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Application} from '../../models/application';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getApplication request.
 */
export interface GetApplicationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the application to retrieve.
   */
  applicationId: string;
}

/**
 * Retrieves a single application.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the application.
 *
 * @example
 * ```typescript
 * const application = await getApplication({
 *   baseUrl: 'https://localhost:8090',
 *   applicationId: '550e8400-e29b-41d4-a716-446655440000',
 * });
 * ```
 */
const getApplication = async ({applicationId, ...config}: GetApplicationConfig): Promise<Application> =>
  requestManagementResource<Application>(config, {
    collection: 'applications',
    failureMessage: 'Failed to fetch application',
    id: applicationId,
    method: 'GET',
    operation: 'getApplication',
  });

export default getApplication;
