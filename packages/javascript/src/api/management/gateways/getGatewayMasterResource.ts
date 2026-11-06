// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {GatewayResourceHistory} from '../../../models/gateway';
import encodePathSegments from '../../../utils/encodePathSegments';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getGatewayMasterResource request.
 */
export interface GetGatewayMasterResourceConfig extends ManagementRequestConfig {
  /**
   * Identifier of the gateway.
   */
  gatewayId: string;
  /**
   * The resource's id, the part of a master entry's `key` after the slash.
   */
  resourceId: string;
  /**
   * The resource type, the part of a master entry's `key` before the slash.
   */
  resourceType: string;
}

/**
 * Retrieves one resource's history on a gateway: its entry in each kept master that records it,
 * newest first.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resource's history.
 *
 * @example
 * ```typescript
 * const {history} = await getGatewayMasterResource({
 *   baseUrl: 'https://localhost:8090',
 *   gatewayId,
 *   resourceId: 'app-1',
 *   resourceType: 'application',
 * });
 * ```
 */
const getGatewayMasterResource = async ({
  gatewayId,
  resourceId,
  resourceType,
  ...config
}: GetGatewayMasterResourceConfig): Promise<GatewayResourceHistory> =>
  requestManagementResource<GatewayResourceHistory>(config, {
    collection: 'gateways',
    failureMessage: 'Failed to fetch gateway resource history',
    id: gatewayId,
    method: 'GET',
    operation: 'getGatewayMasterResource',
    subPath: `master/resources/${encodePathSegments('getGatewayMasterResource', [resourceType, resourceId])}`,
  });

export default getGatewayMasterResource;
