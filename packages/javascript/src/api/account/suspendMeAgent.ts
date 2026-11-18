// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the suspendMeAgent request.
 */
export interface SuspendMeAgentConfig extends ManagementRequestConfig {
  /**
   * Identifier of the personal agent to suspend.
   */
  agentId: string;
}

/**
 * Suspends one of the signed-in user's personal agents, after the server revokes the tokens issued to it.
 * The owner's suspension is independent of the organization's, and suspending again changes nothing.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the agent is suspended.
 *
 * @example
 * ```typescript
 * await suspendMeAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: '6f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b',
 * });
 * ```
 */
const suspendMeAgent = async ({agentId, ...config}: SuspendMeAgentConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    collection: 'users/me/agents',
    failureMessage: 'Failed to suspend your agent',
    id: agentId,
    method: 'POST',
    operation: 'suspendMeAgent',
    subPath: 'suspend',
  });

export default suspendMeAgent;
