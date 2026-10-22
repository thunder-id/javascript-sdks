// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Group, GroupMember} from '../../models/group';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the addGroupMembers request.
 */
export interface AddGroupMembersConfig extends ManagementRequestConfig {
  /**
   * Identifier of the group to add members to.
   */
  groupId: string;
  /**
   * The identities to add.
   */
  members: Pick<GroupMember, 'id' | 'type'>[];
}

/**
 * Adds users, agents or groups to a group.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource the server returned.
 *
 * @example
 * ```typescript
 * await addGroupMembers({baseUrl: 'https://localhost:8090', groupId, members: [{id: userId, type: 'user'}]});
 * ```
 */
const addGroupMembers = async ({groupId, members, ...config}: AddGroupMembersConfig): Promise<Group> =>
  requestManagementResource<Group>(config, {
    body: {members},
    collection: 'groups',
    failureMessage: 'Failed to add group members',
    id: groupId,
    method: 'POST',
    operation: 'addGroupMembers',
    subPath: 'members/add',
  });

export default addGroupMembers;
