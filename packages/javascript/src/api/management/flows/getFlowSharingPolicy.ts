// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {SharingPolicy} from '../../../models/sharing-policy';
import encodePathSegments from '../../../utils/encodePathSegments';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getFlowSharingPolicy request.
 */
export interface GetFlowSharingPolicyConfig extends ManagementRequestConfig {
  /**
   * Identifier of the flow.
   */
  flowId: string;
  /**
   * Identifier of the sharing policy.
   */
  policyId: string;
}

/**
 * Retrieves a sharing policy of a flow.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the policy.
 *
 * @example
 * ```typescript
 * const policy = await getFlowSharingPolicy({baseUrl: 'https://localhost:8090', flowId, policyId});
 * ```
 */
const getFlowSharingPolicy = async ({
  flowId,
  policyId,
  ...config
}: GetFlowSharingPolicyConfig): Promise<SharingPolicy> =>
  requestManagementResource<SharingPolicy>(config, {
    collection: 'flows',
    failureMessage: 'Failed to fetch sharing policy',
    id: flowId,
    method: 'GET',
    operation: 'getFlowSharingPolicy',
    subPath: `sharing-policies/${encodePathSegments('getFlowSharingPolicy', [policyId])}`,
  });

export default getFlowSharingPolicy;
