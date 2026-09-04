// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  FetchHttpClient,
  HttpError,
  HttpRequestConfig,
  HttpResponse,
  UpdateMeCredentialsConfig as BaseUpdateMeCredentialsConfig,
  updateMeCredentials as baseUpdateMeCredentials,
} from '@thunderid/browser';

export interface UpdateMeCredentialsConfig extends Omit<BaseUpdateMeCredentialsConfig, 'fetcher'> {
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  instanceId?: number;
}

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
