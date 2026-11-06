// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {AuthorizationDetailType} from '../../../models/authorization-detail-type';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getAuthorizationDetailType request.
 */
export interface GetAuthorizationDetailTypeConfig extends ManagementRequestConfig {
  /**
   * Identifier of the authorization details type.
   */
  authorizationDetailTypeId: string;
}

/**
 * Retrieves an authorization details type.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the authorization details type.
 *
 * @example
 * ```typescript
 * const item = await getAuthorizationDetailType({baseUrl: 'https://localhost:8090', authorizationDetailTypeId});
 * ```
 */
const getAuthorizationDetailType = async ({
  authorizationDetailTypeId,
  ...config
}: GetAuthorizationDetailTypeConfig): Promise<AuthorizationDetailType> =>
  requestManagementResource<AuthorizationDetailType>(config, {
    collection: 'authorization-detail-types',
    failureMessage: 'Failed to fetch authorization details type',
    id: authorizationDetailTypeId,
    method: 'GET',
    operation: 'getAuthorizationDetailType',
  });

export default getAuthorizationDetailType;
