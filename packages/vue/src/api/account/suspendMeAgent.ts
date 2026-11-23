// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  createHttpClientFetcher,
  suspendMeAgent as baseSuspendMeAgent,
  SuspendMeAgentConfig as BaseSuspendMeAgentConfig,
} from '@thunderid/browser';

export interface SuspendMeAgentConfig extends Omit<BaseSuspendMeAgentConfig, 'fetcher'> {
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
 * Places the owner's suspension on one of the signed-in user's personal agents, with the signed-in user's
 * access token attached by the SDK's HTTP client.
 *
 * @example
 * ```typescript
 * await suspendMeAgent({baseUrl: 'https://localhost:8090', agentId: 'a-1'});
 * ```
 */
const suspendMeAgent = async ({fetcher, instanceId = 0, ...requestConfig}: SuspendMeAgentConfig): Promise<void> =>
  baseSuspendMeAgent({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default suspendMeAgent;
