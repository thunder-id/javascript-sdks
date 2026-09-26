// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {ManagedUser} from '../../models/managed-user';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getUser request.
 */
export interface GetUserConfig extends ManagementRequestConfig {
  /**
   * Identifier of the user to retrieve.
   */
  userId: string;
}

/**
 * Retrieves a single user, with its resolved `display` value.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the user.
 *
 * @example
 * ```typescript
 * const user = await getUser({
 *   baseUrl: 'https://localhost:8090',
 *   userId: '9a475e1e-b0cb-4b29-8df5-2e5b24fb0ed3',
 * });
 * ```
 */
const getUser = async ({userId, ...config}: GetUserConfig): Promise<ManagedUser> =>
  requestManagementResource<ManagedUser>(config, {
    collection: 'users',
    failureMessage: 'Failed to fetch user',
    id: userId,
    method: 'GET',
    operation: 'getUser',
    query: {include: 'display'},
  });

export default getUser;
