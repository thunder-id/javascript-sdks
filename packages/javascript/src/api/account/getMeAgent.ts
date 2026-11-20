// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent} from '../../models/agent-resource';
import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the getMeAgent request.
 */
export interface GetMeAgentConfig extends ManagementRequestConfig {
  /**
   * Identifier of the agent to retrieve.
   */
  agentId: string;
}

/**
 * Retrieves one of the agents the signed-in user owns. Another user's agent, or one outside the
 * organization unit the access token names, is not found.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the agent.
 *
 * @example
 * ```typescript
 * const agent = await getMeAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: '6f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b',
 * });
 * ```
 */
const getMeAgent = async ({agentId, ...config}: GetMeAgentConfig): Promise<Agent> =>
  requestManagementResource<Agent>(config, {
    collection: 'users/me/agents',
    failureMessage: 'Failed to fetch your agent',
    id: agentId,
    method: 'GET',
    operation: 'getMeAgent',
    query: {include: 'display'},
  });

export default getMeAgent;
