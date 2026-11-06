// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {AuthorizationDetailTypeRequest, AuthorizationDetailType} from '../../../models/authorization-detail-type';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the createAuthorizationDetailType request.
 */
export interface CreateAuthorizationDetailTypeConfig extends ManagementRequestConfig {
  /**
   * The authorization details type to create.
   */
  payload: AuthorizationDetailTypeRequest;
}

/**
 * Creates an authorization details type.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the authorization details type as the server stored it.
 *
 * @example
 * ```typescript
 * const item = await createAuthorizationDetailType({
 *   baseUrl: 'https://localhost:8090',
 *   payload: {type: 'payment_initiation', name: 'Payment initiation', schema: {type: 'object'}},
 * });
 * ```
 */
const createAuthorizationDetailType = async ({
  payload,
  ...config
}: CreateAuthorizationDetailTypeConfig): Promise<AuthorizationDetailType> =>
  requestManagementResource<AuthorizationDetailType>(config, {
    body: payload,
    collection: 'authorization-detail-types',
    failureMessage: 'Failed to create authorization details type',
    method: 'POST',
    operation: 'createAuthorizationDetailType',
  });

export default createAuthorizationDetailType;
