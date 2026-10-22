// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import {MembershipGroupListResponse} from '../../models/group';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getUserGroups request.
 */
export type GetUserGroupsConfig = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Identifier of the user whose groups to list.
     */
    userId: string;
  };

/**
 * Retrieves a page of the groups a user belongs to.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {groups} = await getUserGroups({baseUrl: 'https://localhost:8090', userId});
 * ```
 */
const getUserGroups = async ({
  limit,
  offset,
  userId,
  ...config
}: GetUserGroupsConfig): Promise<MembershipGroupListResponse> =>
  requestManagementResource<MembershipGroupListResponse>(config, {
    collection: 'users',
    failureMessage: 'Failed to fetch user groups',
    id: userId,
    method: 'GET',
    operation: 'getUserGroups',
    query: {limit, offset},
    subPath: 'groups',
  });

export default getUserGroups;
