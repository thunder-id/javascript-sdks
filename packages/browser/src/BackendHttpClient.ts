// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {HttpError, HttpRequestConfig, HttpResponse} from '@thunderid/javascript';
import BackendClient from './BackendClient';
import FetchHttpClient from './FetchHttpClient';

/**
 * The HTTP client used when sign-in runs on the backend. It sends each request through the backend's
 * API proxy with the session cookie instead of attaching a token, and refreshes the session once
 * when the backend reports
 * it expired. Requests under `bypass` go straight there with the cookies and, unless turned off, the
 * access token the backend issued.
 */
const hasBackendError = (error: HttpError | undefined, code: string): boolean =>
  error?.response?.status === 401 && (error.response.data as {error?: string} | undefined)?.error === code;

const isSessionExpired = (error: HttpError | undefined): boolean => hasBackendError(error, 'session_expired');

class BackendHttpClient extends FetchHttpClient {
  /**
   * @param backend - The backend client.
   * @param getAccessToken - Returns the access token for bypassed requests; `renew` asks for a new one.
   */
  constructor(
    private readonly backend: BackendClient,
    private readonly getAccessToken: (renew: boolean) => Promise<string>,
  ) {
    super(true);
  }

  protected override async transport<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    if (this.backend.isBypassed(config.url ?? '')) {
      return this.sendBypassed<T>(config);
    }

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

  /**
   * Sends a request straight to its URL, skipping the proxy, with the cookies and the access token.
   * When the API rejects the token, it gets a new one and retries once.
   */
  private async sendBypassed<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    if (!this.backend.attachesTokenOnBypass()) {
      return super.transport<T>({...config, credentials: 'include'});
    }

    const send = async (renew: boolean): Promise<HttpResponse<T>> =>
      super.transport<T>({
        ...config,
        credentials: 'include',
        headers: {
          ...config.headers,
          Authorization: `Bearer ${await this.getAccessToken(renew)}`,
        },
      });

    try {
      return await send(false);
    } catch (error) {
      if ((error as HttpError).response?.status === 401) {
        return send(true);
      }

      throw error;
    }
  }
}

export default BackendHttpClient;
