// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedSelfServiceFlowResponse,
  createHttpClientFetcher,
  executeEmbeddedSelfServiceFlow as baseExecuteEmbeddedSelfServiceFlow,
  ExecuteEmbeddedSelfServiceFlowConfig as BaseExecuteEmbeddedSelfServiceFlowConfig,
} from '@thunderid/browser';

/**
 * Configuration for the executeEmbeddedSelfServiceFlow request (React-specific)
 */
export interface ExecuteEmbeddedSelfServiceFlowConfig
  extends Omit<BaseExecuteEmbeddedSelfServiceFlowConfig, 'fetcher'> {
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
 * Executes one step of a self-service flow for the signed-in user. Uses the ThunderID SPA
 * client's httpClient by default, which attaches the access token the flow identifies the user by.
 *
 * @param config - Configuration object with URL, payload and optional request config.
 * @returns A promise that resolves with the flow step.
 * @example
 * ```typescript
 * const step = await executeEmbeddedSelfServiceFlow({
 *   baseUrl: "https://localhost:8090",
 *   payload: {
 *     flowType: EmbeddedFlowType.SelfService,
 *     handle: "default-self-attribute-verification-flow",
 *     inputs: {attribute: "email"},
 *   },
 * });
 * ```
 */
const executeEmbeddedSelfServiceFlow = async ({
  fetcher,
  instanceId = 0,
  ...requestConfig
}: ExecuteEmbeddedSelfServiceFlowConfig): Promise<EmbeddedSelfServiceFlowResponse> =>
  baseExecuteEmbeddedSelfServiceFlow({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default executeEmbeddedSelfServiceFlow;
