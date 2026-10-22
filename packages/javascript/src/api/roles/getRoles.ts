// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import {RoleListResponse} from '../../models/role';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getRoles request.
 */
export type GetRolesConfig = ManagementRequestConfig & Pick<ApiFilteringParams, 'limit' | 'offset'>;

/**
 * Retrieves a page of roles.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {roles} = await getRoles({baseUrl: 'https://localhost:8090', limit: 20});
 * ```
 */
const getRoles = async ({limit, offset, ...config}: GetRolesConfig): Promise<RoleListResponse> =>
  requestManagementResource<RoleListResponse>(config, {
    collection: 'roles',
    failureMessage: 'Failed to fetch roles',
    method: 'GET',
    operation: 'getRoles',
    query: {limit, offset},
  });

export default getRoles;
