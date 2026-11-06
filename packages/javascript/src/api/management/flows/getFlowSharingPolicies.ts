// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../../models/api';
import {SharingPolicyListResponse} from '../../../models/sharing-policy';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getFlowSharingPolicies request.
 */
export interface GetFlowSharingPoliciesConfig
  extends ManagementRequestConfig,
    Pick<ApiFilteringParams, 'limit' | 'offset'> {
  /**
   * Identifier of the flow.
   */
  flowId: string;
}

/**
 * Retrieves a page of the sharing policies of a flow.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {policies} = await getFlowSharingPolicies({baseUrl: 'https://localhost:8090', flowId});
 * ```
 */
const getFlowSharingPolicies = async ({
  flowId,
  limit,
  offset,
  ...config
}: GetFlowSharingPoliciesConfig): Promise<SharingPolicyListResponse> =>
  requestManagementResource<SharingPolicyListResponse>(config, {
    collection: 'flows',
    failureMessage: 'Failed to fetch sharing policies',
    id: flowId,
    method: 'GET',
    operation: 'getFlowSharingPolicies',
    query: {limit, offset},
    subPath: 'sharing-policies',
  });

export default getFlowSharingPolicies;
