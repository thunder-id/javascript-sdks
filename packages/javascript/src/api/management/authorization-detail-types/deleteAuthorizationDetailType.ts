// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the deleteAuthorizationDetailType request.
 */
export interface DeleteAuthorizationDetailTypeConfig extends ManagementRequestConfig {
  /**
   * Identifier of the authorization details type.
   */
  authorizationDetailTypeId: string;
}

/**
 * Deletes an authorization details type.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has made the change.
 *
 * @example
 * ```typescript
 * await deleteAuthorizationDetailType({baseUrl: 'https://localhost:8090', authorizationDetailTypeId});
 * ```
 */
const deleteAuthorizationDetailType = async ({
  authorizationDetailTypeId,
  ...config
}: DeleteAuthorizationDetailTypeConfig): Promise<void> => {
  await requestManagementResource<void>(config, {
    collection: 'authorization-detail-types',
    failureMessage: 'Failed to delete authorization details type',
    id: authorizationDetailTypeId,
    method: 'DELETE',
    operation: 'deleteAuthorizationDetailType',
  });
};

export default deleteAuthorizationDetailType;
