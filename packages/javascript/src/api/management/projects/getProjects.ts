// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../../models/api';
import {ProjectListResponse} from '../../../models/project';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getProjects request.
 */
export type GetProjectsConfig = ManagementRequestConfig & Pick<ApiFilteringParams, 'limit' | 'offset'>;

/**
 * Retrieves a page of projects.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {projects} = await getProjects({baseUrl: 'https://localhost:8090', limit: 20});
 * ```
 */
const getProjects = async ({limit, offset, ...config}: GetProjectsConfig): Promise<ProjectListResponse> =>
  requestManagementResource<ProjectListResponse>(config, {
    collection: 'projects',
    failureMessage: 'Failed to fetch projects',
    method: 'GET',
    operation: 'getProjects',
    query: {limit, offset},
  });

export default getProjects;
