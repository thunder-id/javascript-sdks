// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import {SupportedAuthorizationDetailsType} from '../../models/authorization-detail-type';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getSupportedAuthorizationDetailsType request. `url`, when given, is the absolute
 * URL of the types endpoint; otherwise it is `{baseUrl}/oauth2/authorization-details-types`.
 */
export interface GetSupportedAuthorizationDetailsTypeConfig extends ManagementRequestConfig {
  /**
   * The type value, such as `payment_initiation` or a URI. It is percent-encoded as one path segment.
   */
  type: string;
}

/**
 * Retrieves the request view of one authorization details type a client may request.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the type's request view.
 *
 * @example
 * ```typescript
 * const paymentType = await getSupportedAuthorizationDetailsType({
 *   baseUrl: 'https://localhost:8090',
 *   type: 'payment_initiation',
 * });
 * ```
 */
const getSupportedAuthorizationDetailsType = async ({
  type,
  ...config
}: GetSupportedAuthorizationDetailsTypeConfig): Promise<SupportedAuthorizationDetailsType> =>
  requestManagementResource<SupportedAuthorizationDetailsType>(config, {
    collection: 'oauth2/authorization-details-types',
    failureMessage: 'Failed to fetch authorization details type',
    id: type,
    method: 'GET',
    operation: 'getSupportedAuthorizationDetailsType',
  });

export default getSupportedAuthorizationDetailsType;
