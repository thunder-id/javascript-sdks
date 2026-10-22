// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {RoleAssignmentInput} from '../../models/role';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the addRoleAssignments request.
 */
export interface AddRoleAssignmentsConfig extends ManagementRequestConfig {
  /**
   * The identities to assign the role to.
   */
  assignments: RoleAssignmentInput[];
  /**
   * Identifier of the role to assign.
   */
  roleId: string;
}

/**
 * Assigns a role to users, groups, apps or agents.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has applied the change.
 *
 * @example
 * ```typescript
 * await addRoleAssignments({baseUrl: 'https://localhost:8090', roleId, assignments: [{id: groupId, type: 'group'}]});
 * ```
 */
const addRoleAssignments = async ({assignments, roleId, ...config}: AddRoleAssignmentsConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    body: {assignments},
    collection: 'roles',
    failureMessage: 'Failed to add role assignments',
    id: roleId,
    method: 'POST',
    operation: 'addRoleAssignments',
    subPath: 'assignments/add',
  });

export default addRoleAssignments;
