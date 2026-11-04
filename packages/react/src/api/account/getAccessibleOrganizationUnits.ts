// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AccessibleOrganizationUnitList,
  createHttpClientFetcher,
  getAccessibleOrganizationUnits as baseGetAccessibleOrganizationUnits,
  GetAccessibleOrganizationUnitsConfig as BaseGetAccessibleOrganizationUnitsConfig,
} from '@thunderid/browser';

export interface GetAccessibleOrganizationUnitsConfig
  extends Omit<BaseGetAccessibleOrganizationUnitsConfig, 'fetcher'> {
  /**
   * Optional custom fetcher function. If not provided, the ThunderID SPA client's httpClient is used, which
   * attaches the signed-in user's access token.
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * Optional instance ID for multi-instance support. Defaults to 0.
   */
  instanceId?: number;
}

/**
 * Lists the organization units the signed-in user can access, from `/users/me/ous`, with the signed-in
 * user's access token attached by the SDK's HTTP client.
 *
 * @example
 * ```typescript
 * const {current, organizationUnits} = await getAccessibleOrganizationUnits({
 *   baseUrl: 'https://localhost:8090',
 *   scope: 'siblings',
 * });
 * ```
 */
const getAccessibleOrganizationUnits = async ({
  fetcher,
  instanceId = 0,
  ...requestConfig
}: GetAccessibleOrganizationUnitsConfig): Promise<AccessibleOrganizationUnitList> =>
  baseGetAccessibleOrganizationUnits({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default getAccessibleOrganizationUnits;
