// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {CreateRoleRequest, Role} from '../../models/role';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the createRole request.
 */
export interface CreateRoleConfig extends ManagementRequestConfig {
  /**
   * The role to create.
   */
  payload: CreateRoleRequest;
}

/**
 * Creates a role, optionally with its first assignments.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource the server returned.
 *
 * @example
 * ```typescript
 * const role = await createRole({baseUrl: 'https://localhost:8090', payload: {name: 'Developer', ouId}});
 * ```
 */
const createRole = async ({payload, ...config}: CreateRoleConfig): Promise<Role> =>
  requestManagementResource<Role>(config, {
    body: payload,
    collection: 'roles',
    failureMessage: 'Failed to create role',
    method: 'POST',
    operation: 'createRole',
  });

export default createRole;
