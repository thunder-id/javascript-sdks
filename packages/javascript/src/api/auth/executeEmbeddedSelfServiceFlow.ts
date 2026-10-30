// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import {EmbeddedSelfServiceFlowRequest, EmbeddedSelfServiceFlowResponse} from '../../models/embedded-self-service-flow';

/**
 * Configuration for the executeEmbeddedSelfServiceFlow request.
 */
export interface ExecuteEmbeddedSelfServiceFlowConfig extends Omit<RequestInit, 'method' | 'body'> {
  /**
   * The base path of the API endpoint.
   */
  baseUrl?: string;
  /**
   * Optional custom fetcher function. If not provided, native fetch is used, which sends no
   * access token; framework SDKs pass a fetcher that attaches the signed-in user's token.
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * The step to execute: an initiating request or a continuation.
   */
  payload: EmbeddedSelfServiceFlowRequest;
  /**
   * The absolute flow execution endpoint.
   */
  url?: string;
}

/**
 * Executes one step of a self-service flow, an operation the signed-in user performs on their own
 * account, such as verifying their email address. A new execution names the flow by its handle; the
 * server takes the user from the access token on that first request and keeps it for the execution.
 *
 * @param config - Configuration object with URL, payload, fetcher and optional request config.
 * @returns A promise that resolves with the flow step.
 * @throws ThunderIDAPIError when the input is invalid or the request fails, coded
 * `executeEmbeddedSelfServiceFlow-` plus `ValidationError-001` (invalid `url` or `baseUrl`), `ValidationError-002`
 * (no payload), `ValidationError-003` (a new flow without a handle), `ResponseError-001` (the server refused, with
 * its status) or `NetworkError-001` (no response, or an unreadable one).
 *
 * @example
 * ```typescript
 * const step = await executeEmbeddedSelfServiceFlow({
 *   baseUrl: 'https://localhost:8090',
 *   payload: {
 *     flowType: 'SELF_SERVICE',
 *     handle: 'default-self-attribute-verification-flow',
 *     inputs: {attribute: 'email'},
 *   },
 *   fetcher: authenticatedFetcher,
 * });
 *
 * await executeEmbeddedSelfServiceFlow({
 *   baseUrl: 'https://localhost:8090',
 *   payload: {executionId: step.executionId, action: 'verify', inputs: {otp: '123456'}},
 *   fetcher: authenticatedFetcher,
 * });
 * ```
 */
const executeEmbeddedSelfServiceFlow = async ({
  url,
  baseUrl,
  payload,
  fetcher,
  ...requestConfig
}: ExecuteEmbeddedSelfServiceFlowConfig): Promise<EmbeddedSelfServiceFlowResponse> => {
  try {
    // eslint-disable-next-line no-new
    new URL((url ?? baseUrl)!);
  } catch (error) {
    throw new ThunderIDAPIError(
      `Invalid URL provided. ${error instanceof Error ? error.message : String(error)}`,
      'executeEmbeddedSelfServiceFlow-ValidationError-001',
      'javascript',
      400,
      'The provided `url` or `baseUrl` path does not adhere to the URL schema.',
    );
  }

  if (!payload) {
    throw new ThunderIDAPIError(
      'Self-service flow payload is required',
      'executeEmbeddedSelfServiceFlow-ValidationError-002',
      'javascript',
      400,
      'If a self-service flow payload is not provided, the request cannot be constructed correctly.',
    );
  }

  if (!payload.executionId && !payload.handle) {
    throw new ThunderIDAPIError(
      'The flow handle is required',
      'executeEmbeddedSelfServiceFlow-ValidationError-003',
      'javascript',
      400,
      'A new self-service flow must name the flow to start by its handle.',
    );
  }

  const fetchFn: typeof fetch = fetcher ?? fetch;
  const resolvedUrl: string = url ?? `${baseUrl}/flow/execute`;

  const requestInit: RequestInit = {
    ...requestConfig,
    // Every step is rendered from `meta`, so always ask for it.
    body: JSON.stringify({...payload, verbose: true}),
    headers: {
      ...requestConfig.headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  };

  try {
    const response: Response = await fetchFn(resolvedUrl, requestInit);

    if (!response?.ok) {
      const errorText: string = await response.text();

      throw new ThunderIDAPIError(
        errorText,
        'executeEmbeddedSelfServiceFlow-ResponseError-001',
        'javascript',
        response.status,
        response.statusText,
        'Self-service flow request failed',
      );
    }

    return (await response.json()) as EmbeddedSelfServiceFlowResponse;
  } catch (error) {
    if (error instanceof ThunderIDAPIError) {
      throw error;
    }

    throw new ThunderIDAPIError(
      `Network or parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'executeEmbeddedSelfServiceFlow-NetworkError-001',
      'javascript',
      0,
      'Network Error',
    );
  }
};

export default executeEmbeddedSelfServiceFlow;
