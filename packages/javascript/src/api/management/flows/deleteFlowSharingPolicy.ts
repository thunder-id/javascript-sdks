// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import encodePathSegments from '../../../utils/encodePathSegments';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the deleteFlowSharingPolicy request.
 */
export interface DeleteFlowSharingPolicyConfig extends ManagementRequestConfig {
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
 * Deletes a sharing policy of a flow.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the server has made the change.
 *
 * @example
 * ```typescript
 * await deleteFlowSharingPolicy({baseUrl: 'https://localhost:8090', flowId, policyId});
 * ```
 */
const deleteFlowSharingPolicy = async ({flowId, policyId, ...config}: DeleteFlowSharingPolicyConfig): Promise<void> => {
  await requestManagementResource<void>(config, {
    collection: 'flows',
    failureMessage: 'Failed to delete sharing policy',
    id: flowId,
    method: 'DELETE',
    operation: 'deleteFlowSharingPolicy',
    subPath: `sharing-policies/${encodePathSegments('deleteFlowSharingPolicy', [policyId])}`,
  });
};

export default deleteFlowSharingPolicy;
