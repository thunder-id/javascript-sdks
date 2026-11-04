// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {SharingPolicy, SharingPolicyUpdateRequest} from '../../../models/sharing-policy';
import encodePathSegments from '../../../utils/encodePathSegments';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the updateFlowSharingPolicy request.
 */
export interface UpdateFlowSharingPolicyConfig extends ManagementRequestConfig {
  /**
   * Identifier of the flow.
   */
  flowId: string;
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
 * Replaces the sections of a sharing policy of a flow. The payload names the version it edits, and
 * an edit against any other version is refused.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the policy as the server stored it.
 *
 * @example
 * ```typescript
 * const policy = await updateFlowSharingPolicy({
 *   baseUrl: 'https://localhost:8090',
 *   flowId,
 *   policyId,
 *   payload: {childUnits: {mode: 'all', excludedOuIds: [ouId]}, version: 1},
 * });
 * ```
 */
const updateFlowSharingPolicy = async ({
  flowId,
  payload,
  policyId,
  ...config
}: UpdateFlowSharingPolicyConfig): Promise<SharingPolicy> =>
  requestManagementResource<SharingPolicy>(config, {
    body: payload,
    collection: 'flows',
    failureMessage: 'Failed to update sharing policy',
    id: flowId,
    method: 'PUT',
    operation: 'updateFlowSharingPolicy',
    subPath: `sharing-policies/${encodePathSegments('updateFlowSharingPolicy', [policyId])}`,
  });

export default updateFlowSharingPolicy;
