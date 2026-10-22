// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the deleteRole request.
 */
export interface DeleteRoleConfig extends ManagementRequestConfig {
  /**
   * Identifier of the role to delete.
   */
  roleId: string;
}

/**
 * Deletes a role.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has applied the change.
 *
 * @example
 * ```typescript
 * await deleteRole({baseUrl: 'https://localhost:8090', roleId});
 * ```
 */
const deleteRole = async ({roleId, ...config}: DeleteRoleConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    collection: 'roles',
    failureMessage: 'Failed to delete role',
    id: roleId,
    method: 'DELETE',
    operation: 'deleteRole',
  });

export default deleteRole;
