// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the deleteMeAgent request.
 */
export interface DeleteMeAgentConfig extends ManagementRequestConfig {
  /**
   * Identifier of the personal agent to delete.
   */
  agentId: string;
}

/**
 * Deletes one of the signed-in user's personal agents.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the agent is deleted.
 *
 * @example
 * ```typescript
 * await deleteMeAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: '6f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b',
 * });
 * ```
 */
const deleteMeAgent = async ({agentId, ...config}: DeleteMeAgentConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    collection: 'users/me/agents',
    failureMessage: 'Failed to delete your agent',
    id: agentId,
    method: 'DELETE',
    operation: 'deleteMeAgent',
  });

export default deleteMeAgent;
