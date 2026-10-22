// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {CreateGroupRequest, Group} from '../../models/group';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the createGroup request.
 */
export interface CreateGroupConfig extends ManagementRequestConfig {
  /**
   * The group to create.
   */
  payload: CreateGroupRequest;
}

/**
 * Creates a group, optionally with its first members.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource the server returned.
 *
 * @example
 * ```typescript
 * const group = await createGroup({baseUrl: 'https://localhost:8090', payload: {name: 'Platform team', ouId}});
 * ```
 */
const createGroup = async ({payload, ...config}: CreateGroupConfig): Promise<Group> =>
  requestManagementResource<Group>(config, {
    body: payload,
    collection: 'groups',
    failureMessage: 'Failed to create group',
    method: 'POST',
    operation: 'createGroup',
  });

export default createGroup;
