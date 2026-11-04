// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {SharingPolicy, SharingPolicyRequest} from '../../../models/sharing-policy';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the createRoleSharingPolicy request.
 */
export interface CreateRoleSharingPolicyConfig extends ManagementRequestConfig {
  /**
   * Identifier of the role.
   */
  roleId: string;
  /**
   * The policy to create.
   */
  payload: SharingPolicyRequest;
}

/**
 * Creates a sharing policy for a role: the organization units it reaches beyond its owner.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the policy as the server stored it.
 *
 * @example
 * ```typescript
 * const policy = await createRoleSharingPolicy({
 *   baseUrl: 'https://localhost:8090',
 *   roleId,
 *   payload: {childUnits: {mode: 'all'}},
 * });
 * ```
 */
const createRoleSharingPolicy = async ({
  roleId,
  payload,
  ...config
}: CreateRoleSharingPolicyConfig): Promise<SharingPolicy> =>
  requestManagementResource<SharingPolicy>(config, {
    body: payload,
    collection: 'roles',
    failureMessage: 'Failed to create sharing policy',
    id: roleId,
    method: 'POST',
    operation: 'createRoleSharingPolicy',
    subPath: 'sharing-policies',
  });

export default createRoleSharingPolicy;
