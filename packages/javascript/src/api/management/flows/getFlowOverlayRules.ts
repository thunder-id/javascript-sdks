// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {FlowResolvedOverlay} from '../../../models/sharing-policy';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getFlowOverlayRules request.
 */
export interface GetFlowOverlayRulesConfig extends ManagementRequestConfig {
  /**
   * Identifier of the flow.
   */
  flowId: string;
  /**
   * Identifier of the organization unit to resolve the rules for.
   */
  ouId: string;
}

/**
 * Retrieves what an organization unit may do with a flow: whether it owns or can see it, and the effective
 * rule for each variable, keyed `variables.<identifier>`. An organization unit no policy reaches gets a
 * not-found error.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resolved overlay.
 *
 * @example
 * ```typescript
 * const {rules} = await getFlowOverlayRules({baseUrl: 'https://localhost:8090', flowId, ouId});
 * ```
 */
const getFlowOverlayRules = async ({
  flowId,
  ouId,
  ...config
}: GetFlowOverlayRulesConfig): Promise<FlowResolvedOverlay> =>
  requestManagementResource<FlowResolvedOverlay>(config, {
    collection: 'flows',
    failureMessage: 'Failed to fetch overlay rules',
    id: flowId,
    method: 'GET',
    operation: 'getFlowOverlayRules',
    query: {ouId},
    subPath: 'overlay-rules',
  });

export default getFlowOverlayRules;
