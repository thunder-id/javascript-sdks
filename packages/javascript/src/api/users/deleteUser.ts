// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the deleteUser request.
 */
export interface DeleteUserConfig extends ManagementRequestConfig {
  /**
   * Identifier of the user to delete.
   */
  userId: string;
}

/**
 * Deletes a user.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the user is deleted.
 *
 * @example
 * ```typescript
 * await deleteUser({
 *   baseUrl: 'https://localhost:8090',
 *   userId: '9a475e1e-b0cb-4b29-8df5-2e5b24fb0ed3',
 * });
 * ```
 */
const deleteUser = async ({userId, ...config}: DeleteUserConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    collection: 'users',
    failureMessage: 'Failed to delete user',
    id: userId,
    method: 'DELETE',
    operation: 'deleteUser',
  });

export default deleteUser;
