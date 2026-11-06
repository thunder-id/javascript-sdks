// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {SharingPolicy, SharingPolicyRequest} from '../../../models/sharing-policy';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the createFlowSharingPolicy request.
 */
export interface CreateFlowSharingPolicyConfig extends ManagementRequestConfig {
  /**
   * Identifier of the flow.
   */
  flowId: string;
  /**
   * The policy to create.
   */
  payload: SharingPolicyRequest;
}

/**
 * Creates a sharing policy for a flow: the organization units it reaches beyond its owner.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the policy as the server stored it.
 *
 * @example
 * ```typescript
 * const policy = await createFlowSharingPolicy({
 *   baseUrl: 'https://localhost:8090',
 *   flowId,
 *   payload: {childUnits: {mode: 'all'}},
 * });
 * ```
 */
const createFlowSharingPolicy = async ({
  flowId,
  payload,
  ...config
}: CreateFlowSharingPolicyConfig): Promise<SharingPolicy> =>
  requestManagementResource<SharingPolicy>(config, {
    body: payload,
    collection: 'flows',
    failureMessage: 'Failed to create sharing policy',
    id: flowId,
    method: 'POST',
    operation: 'createFlowSharingPolicy',
    subPath: 'sharing-policies',
  });

export default createFlowSharingPolicy;
