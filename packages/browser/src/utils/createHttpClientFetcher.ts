// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {HttpError, HttpRequestConfig, HttpResponse} from '@thunderid/javascript';
import FetchHttpClient from '../FetchHttpClient';

/**
 * Builds a `fetch`-shaped function backed by the shared `FetchHttpClient` singleton, for
 * framework wrappers (`@thunderid/react`, `@thunderid/vue`) that need to hand a core
 * `@thunderid/javascript` API function a `fetcher` carrying the access token automatically.
 *
 * Unlike a plain `fetch` call, `FetchHttpClient.request` throws on a non-2xx response instead
 * of resolving it. This adapter catches that and reconstructs a `Response`-shaped object from
 * the thrown error's `response`, so the core API function sees the real status and body instead
 * of treating every non-2xx result as a network failure. A genuine network error (no response
 * attached) still propagates.
 *
 * @param instanceId - Which `FetchHttpClient` instance to use, for multi-instance apps. Defaults to `0`.
 * @returns A function matching the `(url, config) => Promise<Response>` shape core API functions expect.
 * @example
 * ```typescript
 * await updateMeCredentials({
 *   ...config,
 *   fetcher: fetcher ?? createHttpClientFetcher(instanceId),
 * });
 * ```
 */
const createHttpClientFetcher = (instanceId = 0): ((url: string, config: RequestInit) => Promise<Response>) => {
  return async (url: string, config: RequestInit): Promise<Response> => {
    const httpClient: FetchHttpClient = FetchHttpClient.getInstance(instanceId);

    const toResponse = (data: unknown, status: number, statusText: string): Response =>
      ({
        json: () => Promise.resolve(data),
        ok: status >= 200 && status < 300,
        status,
        statusText,
        text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
      }) as Response;

    try {
      const response: HttpResponse<any> = await httpClient.request({
        data: config.body ? JSON.parse(config.body as string) : undefined,
        headers: config.headers as Record<string, string>,
        method: config.method || 'POST',
        signal: config.signal,
        url,
      } as HttpRequestConfig);

      return toResponse(response.data, response.status, response.statusText || '');
    } catch (error) {
      const httpError: HttpError = error as HttpError;
      if (httpError?.response) {
        return toResponse(httpError.response.data, httpError.response.status, httpError.response.statusText ?? '');
      }
      throw error;
    }
  };
};

export default createHttpClientFetcher;
