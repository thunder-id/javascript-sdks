// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import {RoleAssigneeType, RoleAssignmentListResponse} from '../../models/role';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getRoleAssignments request.
 */
export type GetRoleAssignmentsConfig = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Identifier of the role whose assignments to list.
     */
    roleId: string;
    /**
     * Only return assignees of this type. Returns every type when omitted.
     */
    type?: RoleAssigneeType;
  };

/**
 * Retrieves a page of the users, groups, apps and agents a role is assigned to.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {assignments} = await getRoleAssignments({baseUrl: 'https://localhost:8090', roleId, type: 'group'});
 * ```
 */
const getRoleAssignments = async ({
  limit,
  offset,
  roleId,
  type,
  ...config
}: GetRoleAssignmentsConfig): Promise<RoleAssignmentListResponse> =>
  requestManagementResource<RoleAssignmentListResponse>(config, {
    collection: 'roles',
    failureMessage: 'Failed to fetch role assignments',
    id: roleId,
    method: 'GET',
    operation: 'getRoleAssignments',
    query: {include: 'display', limit, offset, type},
    subPath: 'assignments',
  });

export default getRoleAssignments;
