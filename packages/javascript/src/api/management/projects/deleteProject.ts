// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the deleteProject request.
 */
export interface DeleteProjectConfig extends ManagementRequestConfig {
  /**
   * Identifier of the project.
   */
  projectId: string;
}

/**
 * Deletes a project.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has made the change.
 *
 * @example
 * ```typescript
 * await deleteProject({baseUrl: 'https://localhost:8090', projectId});
 * ```
 */
const deleteProject = async ({projectId, ...config}: DeleteProjectConfig): Promise<void> => {
  await requestManagementResource<void>(config, {
    collection: 'projects',
    failureMessage: 'Failed to delete project',
    id: projectId,
    method: 'DELETE',
    operation: 'deleteProject',
  });
};

export default deleteProject;
