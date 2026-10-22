// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {Group} from '../../models/group';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getGroup request.
 */
export interface GetGroupConfig extends ManagementRequestConfig {
  /**
   * Identifier of the group to retrieve.
   */
  groupId: string;
}

/**
 * Retrieves a group.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource the server returned.
 *
 * @example
 * ```typescript
 * const group = await getGroup({baseUrl: 'https://localhost:8090', groupId});
 * ```
 */
const getGroup = async ({groupId, ...config}: GetGroupConfig): Promise<Group> =>
  requestManagementResource<Group>(config, {
    collection: 'groups',
    failureMessage: 'Failed to fetch group',
    id: groupId,
    method: 'GET',
    operation: 'getGroup',
    query: {include: 'display'},
  });

export default getGroup;
