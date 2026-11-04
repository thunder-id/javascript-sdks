// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {CreateProjectRequest, Project} from '../../../models/project';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the createProject request.
 */
export interface CreateProjectConfig extends ManagementRequestConfig {
  /**
   * The project to create.
   */
  payload: CreateProjectRequest;
}

/**
 * Creates a project.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the project as the server stored it.
 *
 * @example
 * ```typescript
 * const item = await createProject({
 *   baseUrl: 'https://localhost:8090',
 *   payload: {handle: 'shop', displayName: 'Shop'},
 * });
 * ```
 */
const createProject = async ({payload, ...config}: CreateProjectConfig): Promise<Project> =>
  requestManagementResource<Project>(config, {
    body: payload,
    collection: 'projects',
    failureMessage: 'Failed to create project',
    method: 'POST',
    operation: 'createProject',
  });

export default createProject;
