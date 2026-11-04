// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {GatewayMaster} from '../../../models/gateway';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getGatewayMasterHistory request.
 */
export interface GetGatewayMasterHistoryConfig extends ManagementRequestConfig {
  /**
   * Identifier of the gateway.
   */
  gatewayId: string;
}

/**
 * Retrieves the masters kept for a gateway, newest first, each with its summary but without its
 * entries or resources.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the masters.
 *
 * @example
 * ```typescript
 * const masters = await getGatewayMasterHistory({baseUrl: 'https://localhost:8090', gatewayId});
 * ```
 */
const getGatewayMasterHistory = async ({
  gatewayId,
  ...config
}: GetGatewayMasterHistoryConfig): Promise<GatewayMaster[]> =>
  requestManagementResource<GatewayMaster[]>(config, {
    collection: 'gateways',
    failureMessage: 'Failed to fetch gateway master history',
    id: gatewayId,
    method: 'GET',
    operation: 'getGatewayMasterHistory',
    subPath: 'master/history',
  });

export default getGatewayMasterHistory;
