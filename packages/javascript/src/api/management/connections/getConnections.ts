// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../../models/api';
import {
  ConnectionCategory,
  ConnectionListResponse,
  ConnectionSummary,
  ConnectionType,
} from '../../../models/connection';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getConnections request.
 */
export type GetConnectionsConfig<T extends ConnectionType | undefined = undefined> = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Lists only the connections in this category. Applies to the listing across every type.
     */
    category?: ConnectionCategory;
    /**
     * Lists the connections this organization unit owns, followed by the ones shared into it, instead of every
     * connection the caller can see. Applies to the listing across every type.
     */
    ouId?: string;
    /**
     * Lists the connections of this type only. The server returns them as an array, without paging, so
     * `category`, `limit` and `offset` do not apply.
     */
    type?: T;
  };

/**
 * What {@link getConnections} resolves with: the connections of one type, or a page across every type.
 */
export type GetConnectionsResult<T extends ConnectionType | undefined> = T extends ConnectionType
  ? ConnectionSummary[]
  : ConnectionListResponse;

/**
 * Retrieves the configured connections: a page across every type, or every connection of one type when
 * `type` is given.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with a page of connections, or the connections of the given type.
 *
 * @example
 * ```typescript
 * const {connections} = await getConnections({baseUrl: 'https://localhost:8090', category: 'identity-provider'});
 * const googleConnections = await getConnections({baseUrl: 'https://localhost:8090', type: 'google'});
 * const available = await getConnections({baseUrl: 'https://localhost:8090', ouId: 'ou-1'});
 * ```
 */
const getConnections = async <T extends ConnectionType | undefined = undefined>({
  category,
  limit,
  offset,
  ouId,
  type,
  ...config
}: GetConnectionsConfig<T>): Promise<GetConnectionsResult<T>> =>
  requestManagementResource<GetConnectionsResult<T>>(
    config,
    type === undefined
      ? {
          collection: 'connections',
          failureMessage: 'Failed to fetch connections',
          method: 'GET',
          operation: 'getConnections',
          query: {category, filter: ouId ? `ouId eq "${ouId.replace(/"/g, '')}"` : undefined, limit, offset},
        }
      : {
          collection: 'connections',
          failureMessage: 'Failed to fetch connections',
          id: type,
          method: 'GET',
          operation: 'getConnections',
        },
  );

export default getConnections;
