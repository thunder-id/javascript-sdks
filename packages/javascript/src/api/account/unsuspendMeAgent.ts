// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the unsuspendMeAgent request.
 */
export interface UnsuspendMeAgentConfig extends ManagementRequestConfig {
  /**
   * Identifier of the personal agent whose owner's suspension to lift.
   */
  agentId: string;
}

/**
 * Lifts the suspension the signed-in user placed on one of their personal agents. A suspension by the
 * organization stays in force, so the agent stays suspended until an administrator lifts it.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves once the owner's suspension is lifted.
 *
 * @example
 * ```typescript
 * await unsuspendMeAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: '6f1e2d3c-4b5a-4978-8a6b-5c4d3e2f1a0b',
 * });
 * ```
 */
const unsuspendMeAgent = async ({agentId, ...config}: UnsuspendMeAgentConfig): Promise<void> =>
  requestManagementResource<void>(config, {
    collection: 'users/me/agents',
    failureMessage: 'Failed to unsuspend your agent',
    id: agentId,
    method: 'POST',
    operation: 'unsuspendMeAgent',
    subPath: 'unsuspend',
  });

export default unsuspendMeAgent;
