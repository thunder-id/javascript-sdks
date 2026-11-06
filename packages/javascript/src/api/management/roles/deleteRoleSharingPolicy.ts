// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import encodePathSegments from '../../../utils/encodePathSegments';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the deleteRoleSharingPolicy request.
 */
export interface DeleteRoleSharingPolicyConfig extends ManagementRequestConfig {
  /**
   * Identifier of the role.
   */
  roleId: string;
  /**
   * Identifier of the sharing policy.
   */
  policyId: string;
}

/**
 * Deletes a sharing policy of a role.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has made the change.
 *
 * @example
 * ```typescript
 * await deleteRoleSharingPolicy({baseUrl: 'https://localhost:8090', roleId, policyId});
 * ```
 */
const deleteRoleSharingPolicy = async ({roleId, policyId, ...config}: DeleteRoleSharingPolicyConfig): Promise<void> => {
  await requestManagementResource<void>(config, {
    collection: 'roles',
    failureMessage: 'Failed to delete sharing policy',
    id: roleId,
    method: 'DELETE',
    operation: 'deleteRoleSharingPolicy',
    subPath: `sharing-policies/${encodePathSegments('deleteRoleSharingPolicy', [policyId])}`,
  });
};

export default deleteRoleSharingPolicy;
