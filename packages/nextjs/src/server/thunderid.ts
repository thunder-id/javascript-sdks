// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AccessibleOrganizationUnitList,
  AccessibleOrganizationUnitsOptions,
  ThunderIDAPIError,
  TokenExchangeRequestConfig,
  TokenResponse,
} from '@thunderid/node';
import getAccessibleOrganizationUnitsAction, {
  GetAccessibleOrganizationUnitsActionResult,
} from './actions/account/getAccessibleOrganizationUnitsAction';
import getSessionIdAction from './actions/getSessionId';
import getClient from './getClient';
import {ThunderIDNextConfig} from '../models/config';

const thunderid = async (): Promise<{
  exchangeToken: (config: TokenExchangeRequestConfig, sessionId: string) => Promise<TokenResponse | Response>;
  getAccessibleOrganizationUnits: (
    options?: AccessibleOrganizationUnitsOptions,
  ) => Promise<AccessibleOrganizationUnitList>;
  getAccessToken: (sessionId: string) => Promise<string>;
  getSessionId: () => Promise<string | undefined>;
  reInitialize: (config: Partial<ThunderIDNextConfig>) => Promise<boolean>;
}> => {
  const getAccessToken = async (sessionId: string): Promise<string> => {
    const client = getClient();
    return client.getAccessToken(sessionId);
  };

  const getSessionId = async (): Promise<string | undefined> => getSessionIdAction();

  const exchangeToken = async (
    config: TokenExchangeRequestConfig,
    sessionId: string,
  ): Promise<TokenResponse | Response> => {
    const client = getClient();
    return client.exchangeToken(config, sessionId);
  };

  const reInitialize = async (config: Partial<ThunderIDNextConfig>): Promise<boolean> => {
    const client = getClient();
    return client.reInitialize(config);
  };

  /**
   * Lists the organization units the signed-in user of this request can access (`/users/me/ous`).
   *
   * @throws {ThunderIDAPIError} With the status and code of the failure; the server's message is not
   *   carried.
   */
  const getAccessibleOrganizationUnits = async (
    options?: AccessibleOrganizationUnitsOptions,
  ): Promise<AccessibleOrganizationUnitList> => {
    const result: GetAccessibleOrganizationUnitsActionResult = await getAccessibleOrganizationUnitsAction(options);

    if (!result.success) {
      throw new ThunderIDAPIError(
        'Failed to list the accessible organization units',
        result.code ?? 'getAccessibleOrganizationUnits-ResponseError-001',
        'nextjs',
        result.statusCode,
      );
    }

    return result.data;
  };

  return {
    exchangeToken,
    getAccessibleOrganizationUnits,
    getAccessToken,
    getSessionId,
    reInitialize,
  };
};

export default thunderid;
