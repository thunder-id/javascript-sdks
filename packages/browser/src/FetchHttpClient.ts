// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {HttpClient, HttpError, HttpRequestConfig, HttpResponse} from '@thunderid/javascript';

/**
 * Fetch-based HTTP client. Extends `HttpClient` and implements `transport()`
 * using the native Fetch API.
 *
 * To plug in a custom HTTP transport, extend `HttpClient` from `@thunderid/javascript`
 * and override `transport()`, then pass your implementation where `FetchHttpClient`
 * is currently used.
 */
export class FetchHttpClient extends HttpClient {
  private static instances: Map<number, FetchHttpClient> = new Map<number, FetchHttpClient>();

  static getInstance(
    instanceId = 0,
    isHandlerEnabled = true,
    attachToken: (request: HttpRequestConfig) => Promise<void> = (): Promise<void> => Promise.resolve(),
  ): FetchHttpClient {
    if (!this.instances.has(instanceId)) {
      this.instances.set(instanceId, new FetchHttpClient(isHandlerEnabled, attachToken));
    }
    return this.instances.get(instanceId)!;
  }

  static destroyInstance(instanceId = 0): void {
    this.instances.delete(instanceId);
  }

  protected async transport<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const {
      attachToken,
      data,
      headers: configHeaders,
      method,
      params,
      shouldAttachIDPAccessToken,
      shouldEncodeToFormData,
      startTimeInMs,
      url: configUrl,
      ...fetchOptions
    } = config;

    let url: string = configUrl ?? '';

    if (params) {
      const qs: string = new URLSearchParams(params).toString();
      if (qs) {
        url = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
      }
    }

    const headers: Record<string, string> = {...(configHeaders ?? {})};
    let body: BodyInit | undefined;

    if (data !== undefined) {
      if (data instanceof FormData) {
        body = data;
      } else {
        body = JSON.stringify(data);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    let fetchResponse: Response;

    try {
      fetchResponse = await fetch(url, {
        credentials: 'include',
        ...fetchOptions,
        body,
        headers,
        method: (method ?? 'GET').toUpperCase(),
      });
    } catch (networkError: any) {
      // A caller-aborted request rejects with an 'AbortError'; keep it distinguishable from a network failure.
      const isAbort: boolean = (networkError as Error | undefined)?.name === 'AbortError';
      throw Object.assign(new Error(networkError.message), {
        code: isAbort ? 'ABORT_ERROR' : 'NETWORK_ERROR',
        config,
        name: isAbort ? 'AbortError' : 'Error',
      } as Partial<HttpError>);
    }

    const contentType: string = fetchResponse.headers.get('content-type') ?? '';
    const responseData: T = contentType.includes('application/json')
      ? await fetchResponse.json()
      : ((await fetchResponse.text()) as any);

    const responseHeaders: Record<string, string> = {};
    fetchResponse.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    if (!fetchResponse.ok) {
      throw Object.assign(new Error(fetchResponse.statusText), {
        config,
        response: {
          data: responseData,
          headers: responseHeaders,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
        },
      } as Partial<HttpError>);
    }

    return {
      config,
      data: responseData,
      headers: responseHeaders,
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
    };
  }
}

export default FetchHttpClient;
