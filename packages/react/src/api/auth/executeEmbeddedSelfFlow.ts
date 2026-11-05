// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedSelfFlowResponse,
  createHttpClientFetcher,
  executeEmbeddedSelfFlow as baseExecuteEmbeddedSelfFlow,
  ExecuteEmbeddedSelfFlowConfig as BaseExecuteEmbeddedSelfFlowConfig,
} from '@thunderid/browser';

/**
 * Configuration for the executeEmbeddedSelfFlow request (React-specific)
 */
export interface ExecuteEmbeddedSelfFlowConfig extends Omit<BaseExecuteEmbeddedSelfFlowConfig, 'fetcher'> {
  /**
   * Optional custom fetcher function. If not provided, the ThunderID SPA client's httpClient is used,
   * which attaches the signed-in user's access token.
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * Optional instance ID for multi-instance support. Defaults to 0.
   */
  instanceId?: number;
}

/**
 * Executes one step of a `SELF` flow for the signed-in user. Uses the ThunderID SPA
 * client's httpClient by default, which attaches the access token the flow identifies the user by.
 *
 * @param config - Configuration object with URL, payload and optional request config.
 * @returns A promise that resolves with the flow step.
 * @example
 * ```typescript
 * const step = await executeEmbeddedSelfFlow({
 *   baseUrl: "https://localhost:8090",
 *   payload: {
 *     flowType: EmbeddedFlowType.Self,
 *     handle: "default-self-attribute-verification-flow",
 *     inputs: {attribute: "email"},
 *   },
 * });
 * ```
 */
const executeEmbeddedSelfFlow = async ({
  fetcher,
  instanceId = 0,
  ...requestConfig
}: ExecuteEmbeddedSelfFlowConfig): Promise<EmbeddedSelfFlowResponse> =>
  baseExecuteEmbeddedSelfFlow({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default executeEmbeddedSelfFlow;
