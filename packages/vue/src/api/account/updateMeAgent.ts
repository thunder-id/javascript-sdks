// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Agent,
  createHttpClientFetcher,
  updateMeAgent as baseUpdateMeAgent,
  UpdateMeAgentConfig as BaseUpdateMeAgentConfig,
} from '@thunderid/browser';

export interface UpdateMeAgentConfig extends Omit<BaseUpdateMeAgentConfig, 'fetcher'> {
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
 * Replaces the part of one of the signed-in user's personal agents its owner may change, with the signed-in
 * user's access token attached by the SDK's HTTP client.
 *
 * @example
 * ```typescript
 * const agent = await updateMeAgent({
 *   baseUrl: 'https://localhost:8090',
 *   agentId: 'a-1',
 *   payload: {attributes: {name: 'Spending assistant'}, grantTypes: ['ciba'], redirectUris: []},
 * });
 * ```
 */
const updateMeAgent = async ({fetcher, instanceId = 0, ...requestConfig}: UpdateMeAgentConfig): Promise<Agent> =>
  baseUpdateMeAgent({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default updateMeAgent;
