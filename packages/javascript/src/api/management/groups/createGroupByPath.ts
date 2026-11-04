// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {CreateGroupByPathRequest, Group} from '../../../models/group';
import encodeHandlePath from '../../../utils/encodeHandlePath';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the createGroupByPath request.
 */
export interface CreateGroupByPathConfig extends ManagementRequestConfig {
  /**
   * Handle path of the organization unit, such as `engineering/platform`. Each handle is encoded and the
   * slashes between them are kept.
   */
  path: string;
  /**
   * The group to create.
   */
  payload: CreateGroupByPathRequest;
}

/**
 * Creates a group in the organization unit at a handle path.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the group as the server stored it.
 *
 * @example
 * ```typescript
 * const group = await createGroupByPath({
 *   baseUrl: 'https://localhost:8090',
 *   path: 'engineering/platform',
 *   payload: {name: 'Sports'},
 * });
 * ```
 */
const createGroupByPath = async ({path, payload, ...config}: CreateGroupByPathConfig): Promise<Group> =>
  requestManagementResource<Group>(config, {
    body: payload,
    collection: 'groups',
    failureMessage: 'Failed to create group',
    id: 'tree',
    method: 'POST',
    operation: 'createGroupByPath',
    subPath: encodeHandlePath('createGroupByPath', path),
  });

export default createGroupByPath;
