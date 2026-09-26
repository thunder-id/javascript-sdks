// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the deleteAgent request.
 */
export interface DeleteAgentConfig extends ManagementRequestConfig {
  /**
   * Identifier of the agent to delete.
   */
  agentId: string;
}

/**
 * Deletes an agent.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the agent is deleted.
 *
 * @example
 * ```typescript
 * await deleteAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: '6f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b',
 * });
 * ```
 */
const deleteAgent = async ({agentId, ...config}: DeleteAgentConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    collection: 'agents',
    failureMessage: 'Failed to delete agent',
    id: agentId,
    method: 'DELETE',
    operation: 'deleteAgent',
  });

export default deleteAgent;
