// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFilteringParams, ManagementRequestConfig} from '../../../models/api';
import {ManagedFlowListResponse} from '../../../models/managed-flow';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getFlows request.
 */
export type GetFlowsConfig = ManagementRequestConfig &
  Pick<ApiFilteringParams, 'limit' | 'offset'> & {
    /**
     * Restricts the list to one flow type, for example `AUTHENTICATION`. All flows are returned
     * when omitted.
     */
    flowType?: string;
    /**
     * Lists the flows this organization unit owns, followed by the ones shared with it, instead of every flow the
     * caller can see.
     */
    ouId?: string;
  };

/**
 * Retrieves a page of flows.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the page of flows.
 *
 * @example
 * ```typescript
 * const {flows, totalResults} = await getFlows({
 *   baseUrl: 'https://localhost:8090',
 *   flowType: 'AUTHENTICATION',
 *   limit: 30,
 * });
 * const shared = await getFlows({baseUrl: 'https://localhost:8090', ouId: 'ou-1'});
 * ```
 */
const getFlows = async ({flowType, limit, offset, ouId, ...config}: GetFlowsConfig): Promise<ManagedFlowListResponse> =>
  requestManagementResource<ManagedFlowListResponse>(config, {
    collection: 'flows',
    failureMessage: 'Failed to fetch flows',
    method: 'GET',
    operation: 'getFlows',
    query: {filter: ouId ? `ouId eq "${ouId.replace(/"/g, '')}"` : undefined, flowType, limit, offset},
  });

export default getFlows;
