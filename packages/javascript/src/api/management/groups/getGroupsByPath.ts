// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../../models/api';
import {GroupListResponse} from '../../../models/group';
import encodeHandlePath from '../../../utils/encodeHandlePath';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getGroupsByPath request.
 */
export interface GetGroupsByPathConfig extends ManagementRequestConfig, Pick<ApiFilteringParams, 'limit' | 'offset'> {
  /**
   * Handle path of the organization unit, such as `engineering/platform`. Each handle is encoded and the
   * slashes between them are kept.
   */
  path: string;
}

/**
 * Retrieves a page of the groups in the organization unit at a handle path.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {groups} = await getGroupsByPath({baseUrl: 'https://localhost:8090', path: 'engineering/platform', limit: 20});
 * ```
 */
const getGroupsByPath = async ({limit, offset, path, ...config}: GetGroupsByPathConfig): Promise<GroupListResponse> =>
  requestManagementResource<GroupListResponse>(config, {
    collection: 'groups',
    failureMessage: 'Failed to fetch groups',
    id: 'tree',
    method: 'GET',
    operation: 'getGroupsByPath',
    query: {include: 'display', limit, offset},
    subPath: encodeHandlePath('getGroupsByPath', path),
  });

export default getGroupsByPath;
