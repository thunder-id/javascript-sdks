// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {Project, UpdateProjectRequest} from '../../../models/project';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the updateProject request.
 */
export interface UpdateProjectConfig extends ManagementRequestConfig {
  /**
   * Identifier of the project.
   */
  projectId: string;
  /**
   * The project's new state.
   */
  payload: UpdateProjectRequest;
}

/**
 * Updates a project.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the project as the server stored it.
 *
 * @example
 * ```typescript
 * const item = await updateProject({
 *   baseUrl: 'https://localhost:8090',
 *   projectId,
 *   payload: {displayName: 'Online shop'},
 * });
 * ```
 */
const updateProject = async ({projectId, payload, ...config}: UpdateProjectConfig): Promise<Project> =>
  requestManagementResource<Project>(config, {
    body: payload,
    collection: 'projects',
    failureMessage: 'Failed to update project',
    id: projectId,
    method: 'PUT',
    operation: 'updateProject',
  });

export default updateProject;
