// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import {ManagedUserListResponse} from '../../models/managed-user';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getUsers request.
 */
export type GetUsersConfig = ManagementRequestConfig & ApiFilteringParams;

/**
 * Retrieves a page of users. Each user carries its resolved `display` value.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page of users.
 *
 * @example
 * ```typescript
 * const {users, totalResults} = await getUsers({
 *   baseUrl: 'https://localhost:8090',
 *   limit: 10,
 *   filter: 'username eq "alice"',
 * });
 * ```
 */
const getUsers = async ({filter, limit, offset, ...config}: GetUsersConfig): Promise<ManagedUserListResponse> =>
  requestManagementResource<ManagedUserListResponse>(config, {
    collection: 'users',
    failureMessage: 'Failed to fetch users',
    method: 'GET',
    operation: 'getUsers',
    query: {filter, include: 'display', limit, offset},
  });

export default getUsers;
