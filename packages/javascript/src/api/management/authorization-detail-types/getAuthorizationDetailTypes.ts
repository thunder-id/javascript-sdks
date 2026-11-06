// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../../models/api';
import {AuthorizationDetailTypeListResponse} from '../../../models/authorization-detail-type';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getAuthorizationDetailTypes request.
 */
export type GetAuthorizationDetailTypesConfig = ManagementRequestConfig & Pick<ApiFilteringParams, 'limit' | 'offset'>;

/**
 * Retrieves a page of authorization details types.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {types} = await getAuthorizationDetailTypes({baseUrl: 'https://localhost:8090', limit: 20});
 * ```
 */
const getAuthorizationDetailTypes = async ({
  limit,
  offset,
  ...config
}: GetAuthorizationDetailTypesConfig): Promise<AuthorizationDetailTypeListResponse> =>
  requestManagementResource<AuthorizationDetailTypeListResponse>(config, {
    collection: 'authorization-detail-types',
    failureMessage: 'Failed to fetch authorization details types',
    method: 'GET',
    operation: 'getAuthorizationDetailTypes',
    query: {limit, offset},
  });

export default getAuthorizationDetailTypes;
