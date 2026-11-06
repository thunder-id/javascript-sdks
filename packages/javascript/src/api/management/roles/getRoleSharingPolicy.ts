// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {SharingPolicy} from '../../../models/sharing-policy';
import encodePathSegments from '../../../utils/encodePathSegments';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getRoleSharingPolicy request.
 */
export interface GetRoleSharingPolicyConfig extends ManagementRequestConfig {
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
 * Retrieves a sharing policy of a role.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the policy.
 *
 * @example
 * ```typescript
 * const policy = await getRoleSharingPolicy({baseUrl: 'https://localhost:8090', roleId, policyId});
 * ```
 */
const getRoleSharingPolicy = async ({
  roleId,
  policyId,
  ...config
}: GetRoleSharingPolicyConfig): Promise<SharingPolicy> =>
  requestManagementResource<SharingPolicy>(config, {
    collection: 'roles',
    failureMessage: 'Failed to fetch sharing policy',
    id: roleId,
    method: 'GET',
    operation: 'getRoleSharingPolicy',
    subPath: `sharing-policies/${encodePathSegments('getRoleSharingPolicy', [policyId])}`,
  });

export default getRoleSharingPolicy;
