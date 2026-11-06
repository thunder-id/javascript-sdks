// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {AuthorizationDetailType, AuthorizationDetailTypeRequest} from '../../../models/authorization-detail-type';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the updateAuthorizationDetailType request.
 */
export interface UpdateAuthorizationDetailTypeConfig extends ManagementRequestConfig {
  /**
   * Identifier of the authorization details type.
   */
  authorizationDetailTypeId: string;
  /**
   * The authorization details type's new state.
   */
  payload: AuthorizationDetailTypeRequest;
}

/**
 * Updates an authorization details type.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the authorization details type as the server stored it.
 *
 * @example
 * ```typescript
 * const item = await updateAuthorizationDetailType({
 *   baseUrl: 'https://localhost:8090',
 *   authorizationDetailTypeId,
 *   payload: {type: 'payment_initiation', name: 'Payment', schema: {type: 'object'}},
 * });
 * ```
 */
const updateAuthorizationDetailType = async ({
  authorizationDetailTypeId,
  payload,
  ...config
}: UpdateAuthorizationDetailTypeConfig): Promise<AuthorizationDetailType> =>
  requestManagementResource<AuthorizationDetailType>(config, {
    body: payload,
    collection: 'authorization-detail-types',
    failureMessage: 'Failed to update authorization details type',
    id: authorizationDetailTypeId,
    method: 'PUT',
    operation: 'updateAuthorizationDetailType',
  });

export default updateAuthorizationDetailType;
