// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AccessibleOrganizationUnit,
  AccessibleOrganizationUnitList,
  AccessibleOrganizationUnitsOptions,
} from '../../models/accessible-organization-unit';
import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getAccessibleOrganizationUnits request.
 */
export interface GetAccessibleOrganizationUnitsConfig
  extends ManagementRequestConfig,
    AccessibleOrganizationUnitsOptions {
  /**
   * The absolute endpoint URL. Defaults to `{baseUrl}/users/me/ous`.
   */
  url?: string;
}

interface AccessibleOrganizationUnitListWire {
  count?: number;
  current?: string;
  organizationUnits?: AccessibleOrganizationUnit[];
  startIndex?: number;
  totalResults?: number;
}

/**
 * Lists the organization units the signed-in user can access, from `/users/me/ous`: the one the user
 * lives in and every one the user is shared into. The request must carry the signed-in user's access
 * token (pass it in `headers`, or a `fetcher` that attaches it).
 *
 * `current` is the unit the list is relative to: the one the token was issued for, or the user's own
 * when the token names none. It is returned whatever the scope or page.
 *
 * @param config - Request configuration: `baseUrl` or `url`, and optional `scope`, `limit` and `offset`.
 * @returns One page of the accessible organization units.
 * @throws {ThunderIDAPIError} `getAccessibleOrganizationUnits-ForbiddenError-001` and
 *   `getAccessibleOrganizationUnits-NotFoundError-001` for 403 and 404, and
 *   `getAccessibleOrganizationUnits-ResponseError-001` for any other rejection, with the server's error
 *   in `serverError`.
 *
 * @example
 * ```typescript
 * const {current, organizationUnits} = await getAccessibleOrganizationUnits({
 *   baseUrl: 'https://localhost:8090',
 *   headers: {Authorization: `Bearer ${accessToken}`},
 *   scope: 'siblings',
 * });
 * ```
 */
const getAccessibleOrganizationUnits = async ({
  limit,
  offset,
  scope,
  baseUrl,
  ...requestConfig
}: GetAccessibleOrganizationUnitsConfig): Promise<AccessibleOrganizationUnitList> => {
  const response: AccessibleOrganizationUnitListWire | undefined =
    await requestManagementResource<AccessibleOrganizationUnitListWire>(
      {...requestConfig, baseUrl: baseUrl?.replace(/\/+$/, '')},
      {
        collection: 'users/me/ous',
        failureMessage: 'Failed to list the accessible organization units',
        method: 'GET',
        operation: 'getAccessibleOrganizationUnits',
        query: {limit, offset, scope},
      },
    );

  const organizationUnits: AccessibleOrganizationUnit[] = response?.organizationUnits ?? [];

  return {
    count: response?.count ?? organizationUnits.length,
    current: response?.current ?? '',
    organizationUnits,
    startIndex: response?.startIndex ?? (offset ?? 0) + 1,
    totalResults: response?.totalResults ?? organizationUnits.length,
  };
};

export default getAccessibleOrganizationUnits;
