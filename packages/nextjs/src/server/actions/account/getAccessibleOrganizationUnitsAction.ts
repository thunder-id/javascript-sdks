// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {
  AccessibleOrganizationUnitList,
  AccessibleOrganizationUnitsOptions,
  ThunderIDAPIError,
  getAccessibleOrganizationUnits,
  resolveResourceEndpoint,
} from '@thunderid/node';
import {ThunderIDNextConfig} from '../../../models/config';
import getClient from '../../getClient';
import getAccessToken from '../getAccessToken';

export type GetAccessibleOrganizationUnitsActionResult =
  | {data: AccessibleOrganizationUnitList; success: true}
  | {code?: string; statusCode?: number; success: false};

/**
 * Lists the organization units the signed-in user can access (`/users/me/ous`) with the session's
 * access token, which stays on the server. Only `scope`, `limit` and `offset` are taken from the caller;
 * the session is the one in the request's cookie.
 *
 * Failures are returned rather than thrown, so the error crosses the server action boundary with its
 * status and code, and without the server's message.
 */
const getAccessibleOrganizationUnitsAction = async ({
  limit,
  offset,
  scope,
}: AccessibleOrganizationUnitsOptions = {}): Promise<GetAccessibleOrganizationUnitsActionResult> => {
  const accessToken: string | undefined = await getAccessToken();

  if (!accessToken) {
    return {statusCode: 401, success: false};
  }

  try {
    const client = getClient();

    if (!client.isInitialized) {
      await client.initialize({} as ThunderIDNextConfig);
    }

    const config: ThunderIDNextConfig = await client.getConfiguration();
    const data: AccessibleOrganizationUnitList = await getAccessibleOrganizationUnits({
      baseUrl: config.baseUrl,
      headers: {Authorization: `Bearer ${accessToken}`},
      limit,
      offset,
      scope: scope === 'siblings' ? 'siblings' : undefined,
      url: resolveResourceEndpoint('usersMeOrganizationUnits', config),
    });

    return {data, success: true};
  } catch (error) {
    if (error instanceof ThunderIDAPIError) {
      return {code: error.code, statusCode: error.statusCode, success: false};
    }

    return {success: false};
  }
};

export default getAccessibleOrganizationUnitsAction;
