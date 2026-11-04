// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {FlowVariableValue, FlowVariables} from '../../../models/managed-flow';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the updateFlowVariables request.
 */
export interface UpdateFlowVariablesConfig extends ManagementRequestConfig {
  /**
   * Identifier of the flow.
   */
  flowId: string;
  /**
   * Identifier of the organization unit whose values are set. The flow has to be owned by, or shared
   * with, it.
   */
  ouId: string;
  /**
   * The value of each variable to set, keyed by identifier. The set replaces what the unit held, so a
   * variable left out returns to its default.
   */
  variables: Record<string, FlowVariableValue>;
}

/**
 * Replaces the values an organization unit holds for a flow's variables. Every value is validated before
 * any is written.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the unit's values after the change.
 *
 * @example
 * ```typescript
 * const {values} = await updateFlowVariables({
 *   baseUrl: 'https://localhost:8090',
 *   flowId,
 *   ouId,
 *   variables: {supportEmail: 'help@example.com', showRegistrationLink: true},
 * });
 * ```
 */
const updateFlowVariables = async ({
  flowId,
  ouId,
  variables,
  ...config
}: UpdateFlowVariablesConfig): Promise<FlowVariables> =>
  requestManagementResource<FlowVariables>(config, {
    body: {ouId, values: variables},
    collection: 'flows',
    failureMessage: 'Failed to update flow variables',
    id: flowId,
    method: 'PUT',
    operation: 'updateFlowVariables',
    subPath: 'variables',
  });

export default updateFlowVariables;
