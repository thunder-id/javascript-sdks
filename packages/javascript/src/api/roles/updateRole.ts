// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Role, UpdateRoleRequest} from '../../models/role';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the updateRole request.
 */
export interface UpdateRoleConfig extends ManagementRequestConfig {
  /**
   * The role's new state.
   */
  payload: UpdateRoleRequest;
  /**
   * Identifier of the role to update.
   */
  roleId: string;
}

/**
 * Replaces a role's name, description and permissions.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource the server returned.
 *
 * @example
 * ```typescript
 * const role = await updateRole({baseUrl: 'https://localhost:8090', roleId, payload});
 * ```
 */
const updateRole = async ({payload, roleId, ...config}: UpdateRoleConfig): Promise<Role> =>
  requestManagementResource<Role>(config, {
    body: payload,
    collection: 'roles',
    failureMessage: 'Failed to update role',
    id: roleId,
    method: 'PUT',
    operation: 'updateRole',
  });

export default updateRole;
