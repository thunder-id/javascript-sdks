// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {SharingPolicy, SharingPolicyUpdateRequest} from '../../../models/sharing-policy';
import encodePathSegments from '../../../utils/encodePathSegments';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the updateRoleSharingPolicy request.
 */
export interface UpdateRoleSharingPolicyConfig extends ManagementRequestConfig {
  /**
   * Identifier of the role.
   */
  roleId: string;
  /**
   * The policy's new sections and the version being edited.
   */
  payload: SharingPolicyUpdateRequest;
  /**
   * Identifier of the sharing policy.
   */
  policyId: string;
}

/**
 * Replaces the sections of a sharing policy of a role. The payload names the version it edits, and
 * an edit against any other version is refused.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the policy as the server stored it.
 *
 * @example
 * ```typescript
 * const policy = await updateRoleSharingPolicy({
 *   baseUrl: 'https://localhost:8090',
 *   roleId,
 *   policyId,
 *   payload: {childUnits: {mode: 'all', excludedOuIds: [ouId]}, version: 1},
 * });
 * ```
 */
const updateRoleSharingPolicy = async ({
  roleId,
  payload,
  policyId,
  ...config
}: UpdateRoleSharingPolicyConfig): Promise<SharingPolicy> =>
  requestManagementResource<SharingPolicy>(config, {
    body: payload,
    collection: 'roles',
    failureMessage: 'Failed to update sharing policy',
    id: roleId,
    method: 'PUT',
    operation: 'updateRoleSharingPolicy',
    subPath: `sharing-policies/${encodePathSegments('updateRoleSharingPolicy', [policyId])}`,
  });

export default updateRoleSharingPolicy;
