// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {HttpError, HttpRequestConfig, HttpResponse} from '@thunderid/javascript';
import BackendClient from './BackendClient';
import FetchHttpClient from './FetchHttpClient';

/**
 * The HTTP client used when sign-in runs on the backend. It sends each request through the backend's
 * API proxy with the session cookie instead of attaching a token, and refreshes the session once
 * when the backend reports
 * it expired.
 */
const hasBackendError = (error: HttpError | undefined, code: string): boolean =>
  error?.response?.status === 401 && (error.response.data as {error?: string} | undefined)?.error === code;

const isSessionExpired = (error: HttpError | undefined): boolean => hasBackendError(error, 'session_expired');

class BackendHttpClient extends FetchHttpClient {
  constructor(private readonly backend: BackendClient) {
    super(true);
  }

  protected override async transport<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const proxyUrl: string | undefined = this.backend.toProxyUrl(config.url ?? '');

    if (!proxyUrl) {
      throw Object.assign(new Error(`"${config.url}" is not under the backend API base, so it cannot be sent.`), {
        code: 'BACKEND_UNSUPPORTED_URL',
        config,
      } as Partial<HttpError>);
    }

    const send = (): Promise<HttpResponse<T>> =>
      super.transport<T>({
        ...config,
        ...BackendClient.requestInit(config.headers),
        url: proxyUrl,
      });

    try {
      return await send();
    } catch (error) {
      // Only the backend's own `session_expired` calls for a refresh. Any other 401 is the API's answer.
      if (isSessionExpired(error as HttpError) && (await this.backend.refresh())) {
        return send();
      }
      if (hasBackendError(error as HttpError, 'login_required')) {
        this.backend.markSignedOut();
      }

      throw error;
    }
  }
}

export default BackendHttpClient;
