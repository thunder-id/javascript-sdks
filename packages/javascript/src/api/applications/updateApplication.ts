// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Application, UpdateApplicationRequest} from '../../models/application';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the updateApplication request.
 */
export interface UpdateApplicationConfig extends ManagementRequestConfig {
  /**
   * Identifier of the application to update.
   */
  applicationId: string;
  /**
   * The application's new state. Mutable fields are replaced, not merged.
   */
  payload: UpdateApplicationRequest;
}

/**
 * Updates an application.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the updated application.
 *
 * @example
 * ```typescript
 * const application = await updateApplication({
 *   baseUrl: 'https://localhost:8090',
 *   applicationId: '550e8400-e29b-41d4-a716-446655440000',
 *   payload: {...existing, name: 'Renamed'},
 * });
 * ```
 */
const updateApplication = async ({applicationId, payload, ...config}: UpdateApplicationConfig): Promise<Application> =>
  requestManagementResource<Application>(config, {
    body: payload,
    collection: 'applications',
    failureMessage: 'Failed to update application',
    id: applicationId,
    method: 'PUT',
    operation: 'updateApplication',
  });

export default updateApplication;
