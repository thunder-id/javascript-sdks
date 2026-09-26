// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent, CreateAgentRequest} from '../../models/agent-resource';
import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the createAgent request.
 */
export interface CreateAgentConfig extends ManagementRequestConfig {
  /**
   * The agent to create.
   */
  payload: CreateAgentRequest;
}

/**
 * Creates an agent.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the agent as the server stored it.
 *
 * @example
 * ```typescript
 * const agent = await createAgent({
 *   baseUrl: 'https://localhost:8090',
 *   payload: {ouId, type: 'default', name: 'Nightly Sync Worker'},
 * });
 * ```
 */
const createAgent = async ({payload, ...config}: CreateAgentConfig): Promise<Agent> =>
  requestManagementResource<Agent>(config, {
    body: payload,
    collection: 'agents',
    failureMessage: 'Failed to create agent',
    method: 'POST',
    operation: 'createAgent',
  });

export default createAgent;
