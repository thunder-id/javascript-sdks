// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  createHttpClientFetcher,
  SuspendAllMeAgentsResponse,
  suspendAllMeAgents as baseSuspendAllMeAgents,
  SuspendAllMeAgentsConfig as BaseSuspendAllMeAgentsConfig,
} from '@thunderid/browser';

export interface SuspendAllMeAgentsConfig extends Omit<BaseSuspendAllMeAgentsConfig, 'fetcher'> {
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
 * Suspends every personal agent of the signed-in user that the user has not already suspended, with the
 * signed-in user's access token attached by the SDK's HTTP client.
 *
 * @example
 * ```typescript
 * const {suspendedCount} = await suspendAllMeAgents({baseUrl: 'https://localhost:8090'});
 * ```
 */
const suspendAllMeAgents = async ({
  fetcher,
  instanceId = 0,
  ...requestConfig
}: SuspendAllMeAgentsConfig): Promise<SuspendAllMeAgentsResponse> =>
  baseSuspendAllMeAgents({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default suspendAllMeAgents;
