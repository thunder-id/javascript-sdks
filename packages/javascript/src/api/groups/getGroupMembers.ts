// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../models/api';
import {GroupMemberListResponse} from '../../models/group';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getGroupMembers request.
 */
export type GetGroupMembersConfig = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Identifier of the group whose members to list.
     */
    groupId: string;
  };

/**
 * Retrieves a page of the users, agents and groups in a group.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {members} = await getGroupMembers({baseUrl: 'https://localhost:8090', groupId});
 * ```
 */
const getGroupMembers = async ({
  groupId,
  limit,
  offset,
  ...config
}: GetGroupMembersConfig): Promise<GroupMemberListResponse> =>
  requestManagementResource<GroupMemberListResponse>(config, {
    collection: 'groups',
    failureMessage: 'Failed to fetch group members',
    id: groupId,
    method: 'GET',
    operation: 'getGroupMembers',
    query: {include: 'display', limit, offset},
    subPath: 'members',
  });

export default getGroupMembers;
