// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the deleteApplication request.
 */
export interface DeleteApplicationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the application to delete.
   */
  applicationId: string;
}

/**
 * Deletes an application.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the application is deleted.
 *
 * @example
 * ```typescript
 * await deleteApplication({
 *   baseUrl: 'https://localhost:8090',
 *   applicationId: '550e8400-e29b-41d4-a716-446655440000',
 * });
 * ```
 */
const deleteApplication = async ({applicationId, ...config}: DeleteApplicationConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    collection: 'applications',
    failureMessage: 'Failed to delete application',
    id: applicationId,
    method: 'DELETE',
    operation: 'deleteApplication',
  });

export default deleteApplication;
