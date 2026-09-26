// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent, UpdateAgentRequest} from '../../models/agent-resource';
import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the updateAgent request.
 */
export interface UpdateAgentConfig extends ManagementRequestConfig {
  /**
   * Identifier of the agent to update.
   */
  agentId: string;
  /**
   * The agent's new state.
   */
  payload: UpdateAgentRequest;
}

/**
 * Updates an agent.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the updated agent.
 *
 * @example
 * ```typescript
 * const agent = await updateAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: '6f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b',
 *   payload: {name: 'Renamed Agent'},
 * });
 * ```
 */
const updateAgent = async ({agentId, payload, ...config}: UpdateAgentConfig): Promise<Agent> =>
  requestManagementResource<Agent>(config, {
    body: payload,
    collection: 'agents',
    failureMessage: 'Failed to update agent',
    id: agentId,
    method: 'PUT',
    operation: 'updateAgent',
  });

export default updateAgent;
