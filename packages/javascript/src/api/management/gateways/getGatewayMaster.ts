// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {GatewayMaster} from '../../../models/gateway';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getGatewayMaster request.
 */
export interface GetGatewayMasterConfig extends ManagementRequestConfig {
  /**
   * Identifier of the gateway.
   */
  gatewayId: string;
}

/**
 * Retrieves a gateway's latest master: every resource deployed to it, as the gateway last accepted it.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the master.
 *
 * @example
 * ```typescript
 * const {entries} = await getGatewayMaster({baseUrl: 'https://localhost:8090', gatewayId});
 * ```
 */
const getGatewayMaster = async ({gatewayId, ...config}: GetGatewayMasterConfig): Promise<GatewayMaster> =>
  requestManagementResource<GatewayMaster>(config, {
    collection: 'gateways',
    failureMessage: 'Failed to fetch gateway master',
    id: gatewayId,
    method: 'GET',
    operation: 'getGatewayMaster',
    subPath: 'master',
  });

export default getGatewayMaster;
