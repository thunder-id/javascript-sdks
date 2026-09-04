// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  HttpError,
  HttpResponse,
  FetchHttpClient,
  HttpRequestConfig,
  updateMeCredentials as baseUpdateMeCredentials,
  UpdateMeCredentialsConfig as BaseUpdateMeCredentialsConfig,
} from '@thunderid/browser';

/**
 * Configuration for the updateMeCredentials request (React-specific)
 */
export interface UpdateMeCredentialsConfig extends Omit<BaseUpdateMeCredentialsConfig, 'fetcher'> {
  /**
   * Optional custom fetcher function. If not provided, the ThunderID SPA client's httpClient will be used,
   * which attaches the access token to the request.
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * Optional instance ID for multi-instance support. Defaults to 0.
   */
  instanceId?: number;
}

/**
 * Updates the signed-in user's credentials at the specified /users/me/update-credentials endpoint.
 * This function uses the ThunderID SPA client's httpClient by default, but allows for custom fetchers.
 *
 * The endpoint responds with `204 No Content`, so this resolves with `void`.
 *
 * @param config - Configuration object with URL, payload and optional request config.
 * @returns A promise that resolves once the credentials have been updated.
 * @example
 * ```typescript
 * // Using default ThunderID SPA client httpClient
 * await updateMeCredentials({
 *   url: "https://localhost:8090/users/me/update-credentials",
 *   currentPassword: "0ldP@ssword!",
 *   payload: { password: "n3wP@ssword!" }
 * });
 * ```
 */
const updateMeCredentials = async ({
  fetcher,
  instanceId = 0,
  ...requestConfig
}: UpdateMeCredentialsConfig): Promise<void> => {
  const defaultFetcher = async (url: string, config: RequestInit): Promise<Response> => {
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
        url,
      } as HttpRequestConfig);

      return toResponse(response.data, response.status, response.statusText || '');
    } catch (error) {
      // httpClient.request throws on a non-2xx response rather than resolving it, so an error
      // that carries a real HTTP response is converted back into one here. That lets the core
      // updateMeCredentials see the actual status and body instead of treating it as a network
      // failure. A genuine network error (no response) still propagates.
      const httpError: HttpError = error as HttpError;
      if (httpError?.response) {
        return toResponse(httpError.response.data, httpError.response.status, httpError.response.statusText ?? '');
      }
      throw error;
    }
  };

  return baseUpdateMeCredentials({
    ...requestConfig,
    fetcher: fetcher || defaultFetcher,
  });
};

export default updateMeCredentials;
