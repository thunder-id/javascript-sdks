// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Agent,
  createHttpClientFetcher,
  getMeAgent as baseGetMeAgent,
  GetMeAgentConfig as BaseGetMeAgentConfig,
} from '@thunderid/browser';

export interface GetMeAgentConfig extends Omit<BaseGetMeAgentConfig, 'fetcher'> {
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
 * Retrieves one of the agents the signed-in user owns, with the signed-in user's access token attached by the
 * SDK's HTTP client.
 *
 * @example
 * ```typescript
 * const agent = await getMeAgent({baseUrl: 'https://localhost:8090', agentId: 'a-1'});
 * ```
 */
const getMeAgent = async ({fetcher, instanceId = 0, ...requestConfig}: GetMeAgentConfig): Promise<Agent> =>
  baseGetMeAgent({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default getMeAgent;
