// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Group, GroupMember} from '../../models/group';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the removeGroupMembers request.
 */
export interface RemoveGroupMembersConfig extends ManagementRequestConfig {
  /**
   * Identifier of the group to remove members from.
   */
  groupId: string;
  /**
   * The identities to remove.
   */
  members: Pick<GroupMember, 'id' | 'type'>[];
}

/**
 * Removes users, agents or groups from a group.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource the server returned.
 *
 * @example
 * ```typescript
 * await removeGroupMembers({baseUrl: 'https://localhost:8090', groupId, members: [{id: userId, type: 'user'}]});
 * ```
 */
const removeGroupMembers = async ({groupId, members, ...config}: RemoveGroupMembersConfig): Promise<Group> =>
  requestManagementResource<Group>(config, {
    body: {members},
    collection: 'groups',
    failureMessage: 'Failed to remove group members',
    id: groupId,
    method: 'POST',
    operation: 'removeGroupMembers',
    subPath: 'members/remove',
  });

export default removeGroupMembers;
