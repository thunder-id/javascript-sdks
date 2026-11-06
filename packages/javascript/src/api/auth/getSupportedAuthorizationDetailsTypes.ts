// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {SupportedAuthorizationDetailsTypesResponse} from '../../models/authorization-detail-type';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getSupportedAuthorizationDetailsTypes request. `url`, when given, is the absolute
 * URL of the types endpoint, such as the `authorization_details_types_endpoint` the server's discovery
 * document advertises; otherwise it is `{baseUrl}/oauth2/authorization-details-types`. The endpoint is
 * public, so no access token is needed.
 */
export type GetSupportedAuthorizationDetailsTypesConfig = ManagementRequestConfig;

/**
 * Retrieves the RFC 9396 authorization details types a client may request, each with the fields a client
 * may send and the changes it may make to a granted detail at the token endpoint.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with every registered type's request view.
 *
 * @example
 * ```typescript
 * const {types} = await getSupportedAuthorizationDetailsTypes({baseUrl: 'https://localhost:8090'});
 * ```
 */
const getSupportedAuthorizationDetailsTypes = async (
  config: GetSupportedAuthorizationDetailsTypesConfig,
): Promise<SupportedAuthorizationDetailsTypesResponse> =>
  requestManagementResource<SupportedAuthorizationDetailsTypesResponse>(config, {
    collection: 'oauth2/authorization-details-types',
    failureMessage: 'Failed to fetch authorization details types',
    method: 'GET',
    operation: 'getSupportedAuthorizationDetailsTypes',
  });

export default getSupportedAuthorizationDetailsTypes;
