// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Role} from '../../models/role';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getRole request.
 */
export interface GetRoleConfig extends ManagementRequestConfig {
  /**
   * Identifier of the role to retrieve.
   */
  roleId: string;
}

/**
 * Retrieves a role with the permissions it grants.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource the server returned.
 *
 * @example
 * ```typescript
 * const role = await getRole({baseUrl: 'https://localhost:8090', roleId});
 * ```
 */
const getRole = async ({roleId, ...config}: GetRoleConfig): Promise<Role> =>
  requestManagementResource<Role>(config, {
    collection: 'roles',
    failureMessage: 'Failed to fetch role',
    id: roleId,
    method: 'GET',
    operation: 'getRole',
  });

export default getRole;
