// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent} from '../../models/agent-resource';
import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getAgent request.
 */
export interface GetAgentConfig extends ManagementRequestConfig {
  /**
   * Identifier of the agent to retrieve.
   */
  agentId: string;
}

/**
 * Retrieves a single agent.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the agent.
 *
 * @example
 * ```typescript
 * const agent = await getAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: '6f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b',
 * });
 * ```
 */
const getAgent = async ({agentId, ...config}: GetAgentConfig): Promise<Agent> =>
  requestManagementResource<Agent>(config, {
    collection: 'agents',
    failureMessage: 'Failed to fetch agent',
    id: agentId,
    method: 'GET',
    operation: 'getAgent',
    query: {include: 'display'},
  });

export default getAgent;
