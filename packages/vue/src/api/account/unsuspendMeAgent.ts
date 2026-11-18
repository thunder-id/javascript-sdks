// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  createHttpClientFetcher,
  unsuspendMeAgent as baseUnsuspendMeAgent,
  UnsuspendMeAgentConfig as BaseUnsuspendMeAgentConfig,
} from '@thunderid/browser';

export interface UnsuspendMeAgentConfig extends Omit<BaseUnsuspendMeAgentConfig, 'fetcher'> {
  /**
   * Optional custom fetcher function. If not provided, the ThunderID SPA client's httpClient is used, which
   * attaches the signed-in user's access token.
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * Optional instance ID for multi-instance support. Defaults to 0.
   */
  instanceId?: number;
}

/**
 * Lifts the owner's suspension from one of the signed-in user's personal agents, with the signed-in user's
 * access token attached by the SDK's HTTP client.
 *
 * @example
 * ```typescript
 * await unsuspendMeAgent({baseUrl: 'https://localhost:8090', agentId: 'a-1'});
 * ```
 */
const unsuspendMeAgent = async ({fetcher, instanceId = 0, ...requestConfig}: UnsuspendMeAgentConfig): Promise<void> =>
  baseUnsuspendMeAgent({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default unsuspendMeAgent;
