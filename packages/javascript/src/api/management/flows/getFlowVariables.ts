// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {FlowVariables} from '../../../models/managed-flow';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getFlowVariables request.
 */
export interface GetFlowVariablesConfig extends ManagementRequestConfig {
  /**
   * Identifier of the flow.
   */
  flowId: string;
  /**
   * Identifier of the organization unit whose values are read. The flow has to be owned by, or shared
   * with, it.
   */
  ouId: string;
}

/**
 * Retrieves the values an organization unit has set for a flow's variables. The value in force for a
 * variable is this override, or else its `defaultValue` from `getFlow`.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the unit's values, keyed by variable identifier.
 *
 * @example
 * ```typescript
 * const {values} = await getFlowVariables({baseUrl: 'https://localhost:8090', flowId, ouId});
 * ```
 */
const getFlowVariables = async ({flowId, ouId, ...config}: GetFlowVariablesConfig): Promise<FlowVariables> =>
  requestManagementResource<FlowVariables>(config, {
    collection: 'flows',
    failureMessage: 'Failed to fetch flow variables',
    id: flowId,
    method: 'GET',
    operation: 'getFlowVariables',
    query: {ouId},
    subPath: 'variables',
  });

export default getFlowVariables;
