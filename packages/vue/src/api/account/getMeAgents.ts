// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AgentListResponse,
  createHttpClientFetcher,
  getMeAgents as baseGetMeAgents,
  GetMeAgentsConfig as BaseGetMeAgentsConfig,
} from '@thunderid/browser';

export interface GetMeAgentsConfig extends Omit<BaseGetMeAgentsConfig, 'fetcher'> {
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
 * Retrieves a page of the agents the signed-in user owns, from `/users/me/agents`, with the signed-in user's
 * access token attached by the SDK's HTTP client.
 *
 * @example
 * ```typescript
 * const {agents, totalResults} = await getMeAgents({
 *   baseUrl: 'https://localhost:8090',
 *   kind: PERSONAL_AGENT_KIND,
 *   limit: 10,
 * });
 * ```
 */
const getMeAgents = async ({
  fetcher,
  instanceId = 0,
  ...requestConfig
}: GetMeAgentsConfig): Promise<AgentListResponse> =>
  baseGetMeAgents({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default getMeAgents;
