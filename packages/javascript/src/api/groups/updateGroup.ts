// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Group, UpdateGroupRequest} from '../../models/group';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the updateGroup request.
 */
export interface UpdateGroupConfig extends ManagementRequestConfig {
  /**
   * Identifier of the group to update.
   */
  groupId: string;
  /**
   * The group's new state.
   */
  payload: UpdateGroupRequest;
}

/**
 * Updates a group's name, description or organization unit.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource the server returned.
 *
 * @example
 * ```typescript
 * const group = await updateGroup({baseUrl: 'https://localhost:8090', groupId, payload});
 * ```
 */
const updateGroup = async ({groupId, payload, ...config}: UpdateGroupConfig): Promise<Group> =>
  requestManagementResource<Group>(config, {
    body: payload,
    collection: 'groups',
    failureMessage: 'Failed to update group',
    id: groupId,
    method: 'PUT',
    operation: 'updateGroup',
  });

export default updateGroup;
