// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {CreateManagedUserRequest, ManagedUser} from '../../models/managed-user';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the createUser request.
 */
export interface CreateUserConfig extends ManagementRequestConfig {
  /**
   * The user to create.
   */
  payload: CreateManagedUserRequest;
}

/**
 * Creates a user.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the user as the server stored it.
 *
 * @example
 * ```typescript
 * const user = await createUser({
 *   baseUrl: 'https://localhost:8090',
 *   payload: {ouId, type: 'customer', attributes: {username: 'alice'}},
 * });
 * ```
 */
const createUser = async ({payload, ...config}: CreateUserConfig): Promise<ManagedUser> =>
  requestManagementResource<ManagedUser>(config, {
    body: payload,
    collection: 'users',
    failureMessage: 'Failed to create user',
    method: 'POST',
    operation: 'createUser',
  });

export default createUser;
