// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../../models/api';
import {SharingPolicyListResponse} from '../../../models/sharing-policy';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getRoleSharingPolicies request.
 */
export interface GetRoleSharingPoliciesConfig
  extends ManagementRequestConfig,
    Pick<ApiFilteringParams, 'limit' | 'offset'> {
  /**
   * Identifier of the role.
   */
  roleId: string;
}

/**
 * Retrieves a page of the sharing policies of a role.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page the server returned.
 *
 * @example
 * ```typescript
 * const {policies} = await getRoleSharingPolicies({baseUrl: 'https://localhost:8090', roleId});
 * ```
 */
const getRoleSharingPolicies = async ({
  roleId,
  limit,
  offset,
  ...config
}: GetRoleSharingPoliciesConfig): Promise<SharingPolicyListResponse> =>
  requestManagementResource<SharingPolicyListResponse>(config, {
    collection: 'roles',
    failureMessage: 'Failed to fetch sharing policies',
    id: roleId,
    method: 'GET',
    operation: 'getRoleSharingPolicies',
    query: {limit, offset},
    subPath: 'sharing-policies',
  });

export default getRoleSharingPolicies;
