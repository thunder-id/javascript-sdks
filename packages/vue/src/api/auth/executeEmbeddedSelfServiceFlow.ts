// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedSelfServiceFlowResponse,
  createHttpClientFetcher,
  executeEmbeddedSelfServiceFlow as baseExecuteEmbeddedSelfServiceFlow,
  ExecuteEmbeddedSelfServiceFlowConfig as BaseExecuteEmbeddedSelfServiceFlowConfig,
} from '@thunderid/browser';

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
 * Executes one step of a self-service flow for the signed-in user, through the authenticated
 * transport that attaches the access token the flow identifies the user by.
 *
 * @param config - Configuration object with URL, payload and optional request config.
 * @returns A promise that resolves with the flow step.
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
