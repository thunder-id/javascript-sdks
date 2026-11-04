// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {Project} from '../../../models/project';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getProject request.
 */
export interface GetProjectConfig extends ManagementRequestConfig {
  /**
   * Identifier of the project.
   */
  projectId: string;
}

/**
 * Retrieves a project.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the project.
 *
 * @example
 * ```typescript
 * const item = await getProject({baseUrl: 'https://localhost:8090', projectId});
 * ```
 */
const getProject = async ({projectId, ...config}: GetProjectConfig): Promise<Project> =>
  requestManagementResource<Project>(config, {
    collection: 'projects',
    failureMessage: 'Failed to fetch project',
    id: projectId,
    method: 'GET',
    operation: 'getProject',
  });

export default getProject;
