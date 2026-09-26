// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Application, CreateApplicationRequest} from '../../models/application';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the createApplication request.
 */
export interface CreateApplicationConfig extends ManagementRequestConfig {
  /**
   * The application to create.
   */
  payload: CreateApplicationRequest;
}

/**
 * Creates an application.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the application as the server stored it.
 *
 * @example
 * ```typescript
 * const application = await createApplication({
 *   baseUrl: 'https://localhost:8090',
 *   payload: {name: 'My SPA', url: 'http://localhost:3000'},
 * });
 * ```
 */
const createApplication = async ({payload, ...config}: CreateApplicationConfig): Promise<Application> =>
  requestManagementResource<Application>(config, {
    body: payload,
    collection: 'applications',
    failureMessage: 'Failed to create application',
    method: 'POST',
    operation: 'createApplication',
  });

export default createApplication;
