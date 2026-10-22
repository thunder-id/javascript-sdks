// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the deleteGroup request.
 */
export interface DeleteGroupConfig extends ManagementRequestConfig {
  /**
   * Identifier of the group to delete.
   */
  groupId: string;
}

/**
 * Deletes a group.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has applied the change.
 *
 * @example
 * ```typescript
 * await deleteGroup({baseUrl: 'https://localhost:8090', groupId});
 * ```
 */
const deleteGroup = async ({groupId, ...config}: DeleteGroupConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    collection: 'groups',
    failureMessage: 'Failed to delete group',
    id: groupId,
    method: 'DELETE',
    operation: 'deleteGroup',
  });

export default deleteGroup;
