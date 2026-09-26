// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFetcher, FetchHttpClient, HttpError, HttpRequestConfig, HttpResponse} from '@thunderid/browser';

const toResponse = (data: unknown, status: number, statusText: string | undefined): Response =>
  ({
    json: () => Promise.resolve(data),
    ok: status >= 200 && status < 300,
    status,
    statusText: statusText ?? '',
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  }) as Response;

/**
 * Creates a fetch-compatible function backed by the SDK's HTTP client for the given instance, so
 * requests carry the signed-in user's access token.
 *
 * The HTTP client throws on a non-2xx status. This fetcher turns that back into a non-OK response
 * so callers can read the real status (for example, to tell a 403 from a 404).
 *
 * @param instanceId - The ThunderID instance whose HTTP client should be used.
 * @returns A fetcher that can be passed to any core API function.
 */
const createAuthenticatedFetcher =
  (instanceId = 0): ApiFetcher =>
  async (url: string, config: RequestInit): Promise<Response> => {
    const httpClient: FetchHttpClient = FetchHttpClient.getInstance(instanceId);

    try {
      const response: HttpResponse<unknown> = await httpClient.request({
        data: typeof config.body === 'string' ? (JSON.parse(config.body) as unknown) : undefined,
        headers: config.headers as Record<string, string>,
        method: config.method ?? 'GET',
        url,
      } as HttpRequestConfig);

      return toResponse(response.data, response.status, response.statusText);
    } catch (error) {
      const {response} = error as HttpError;

      if (!response) {
        throw error;
      }

      return toResponse(response.data, response.status, response.statusText);
    }
  };

export default createAuthenticatedFetcher;
