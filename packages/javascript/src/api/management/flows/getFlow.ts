// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {ManagedFlowDefinition} from '../../../models/managed-flow';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getFlow request.
 */
export interface GetFlowConfig extends ManagementRequestConfig {
  /**
   * Identifier of the flow.
   */
  flowId: string;
  /**
   * Returns the flow as this organization unit sees it. A flow shared with the unit comes back as its
   * variables only. Leave it out for the whole definition.
   */
  ouId?: string;
}

/**
 * Retrieves a flow with its graph.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the flow.
 *
 * @example
 * ```typescript
 * const flow = await getFlow({baseUrl: 'https://localhost:8090', flowId});
 * ```
 */
const getFlow = async ({flowId, ouId, ...config}: GetFlowConfig): Promise<ManagedFlowDefinition> =>
  requestManagementResource<ManagedFlowDefinition>(config, {
    collection: 'flows',
    failureMessage: 'Failed to fetch flow',
    id: flowId,
    method: 'GET',
    operation: 'getFlow',
    query: {ouId},
  });

export default getFlow;
