// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {ManagedUser, UpdateManagedUserRequest} from '../../models/managed-user';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the updateUser request.
 */
export interface UpdateUserConfig extends ManagementRequestConfig {
  /**
   * The user's new state.
   */
  payload: UpdateManagedUserRequest;
  /**
   * Identifier of the user to update.
   */
  userId: string;
}

/**
 * Updates a user.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the updated user.
 *
 * @example
 * ```typescript
 * const user = await updateUser({
 *   baseUrl: 'https://localhost:8090',
 *   userId: '9a475e1e-b0cb-4b29-8df5-2e5b24fb0ed3',
 *   payload: {attributes: {givenName: 'Alice'}},
 * });
 * ```
 */
const updateUser = async ({userId, payload, ...config}: UpdateUserConfig): Promise<ManagedUser> =>
  requestManagementResource<ManagedUser>(config, {
    body: payload,
    collection: 'users',
    failureMessage: 'Failed to update user',
    id: userId,
    method: 'PUT',
    operation: 'updateUser',
  });

export default updateUser;
