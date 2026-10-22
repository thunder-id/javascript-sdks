// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {RoleAssignmentInput} from '../../models/role';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the removeRoleAssignments request.
 */
export interface RemoveRoleAssignmentsConfig extends ManagementRequestConfig {
  /**
   * The identities to remove the role from.
   */
  assignments: RoleAssignmentInput[];
  /**
   * Identifier of the role to unassign.
   */
  roleId: string;
}

/**
 * Removes a role from users, groups, apps or agents.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has applied the change.
 *
 * @example
 * ```typescript
 * await removeRoleAssignments({baseUrl: 'https://localhost:8090', roleId, assignments: [{id: userId, type: 'user'}]});
 * ```
 */
const removeRoleAssignments = async ({assignments, roleId, ...config}: RemoveRoleAssignmentsConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    body: {assignments},
    collection: 'roles',
    failureMessage: 'Failed to remove role assignments',
    id: roleId,
    method: 'POST',
    operation: 'removeRoleAssignments',
    subPath: 'assignments/remove',
  });

export default removeRoleAssignments;
