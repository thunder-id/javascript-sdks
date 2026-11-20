// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Agent, UpdateMeAgentRequest} from '../../models/agent-resource';
import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the updateMeAgent request.
 */
export interface UpdateMeAgentConfig extends ManagementRequestConfig {
  /**
   * Identifier of the personal agent to update.
   */
  agentId: string;
  /**
   * The whole editable part of the agent. Read the agent first and send these fields back with the changes.
   */
  payload: UpdateMeAgentRequest;
}

/**
 * Replaces the part of one of the signed-in user's personal agents its owner may change: the description,
 * the attributes (including the name), the grant types and the redirect URIs.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the updated agent.
 *
 * @example
 * ```typescript
 * const agent = await updateMeAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: '6f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b',
 *   payload: {
 *     attributes: {name: 'Spending assistant'},
 *     grantTypes: ['authorization_code', 'refresh_token'],
 *     redirectUris: ['https://assistant.example.com/callback'],
 *   },
 * });
 * ```
 */
const updateMeAgent = async ({agentId, payload, ...config}: UpdateMeAgentConfig): Promise<Agent> =>
  requestManagementResource<Agent>(config, {
    body: payload,
    collection: 'users/me/agents',
    failureMessage: 'Failed to update your agent',
    id: agentId,
    method: 'PUT',
    operation: 'updateMeAgent',
  });

export default updateMeAgent;
