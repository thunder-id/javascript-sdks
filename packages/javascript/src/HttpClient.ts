// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {HttpError, HttpRequestConfig, HttpResponse} from './models/http';

/**
 * How a request ended, for a request observer.
 */
export type HttpRequestOutcome =
  | {headers?: Record<string, string>; ok: true; status: number}
  | {error: HttpError; ok: false};

/**
 * Sees every request this client sends and how its transport ended, whether or not the request
 * handlers are enabled. A request that fails before it is sent, such as when its token cannot be
 * attached, is not seen. It must not throw; whatever it does never affects the request, and it gets a
 * copy of the response headers.
 */
export type HttpRequestObserver = (config: HttpRequestConfig, outcome: HttpRequestOutcome) => void;

/**
 * Abstract base class for HTTP clients. Owns all handler/callback state and
 * the request lifecycle (pre-processing, transport, post-processing).
 *
 * Extend this class and implement `transport()` to plug in a custom HTTP transport.
 *
 * @example
 * ```ts
 * class MyHttpClient extends HttpClient {
 *   protected async transport<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
 *     // custom fetch logic
 *   }
 * }
 * ```
 */
export abstract class HttpClient {
  private static readonly DEFAULT_HANDLER_DISABLE_TIMEOUT: number = 1000;

  private requestStartCallback: (request: HttpRequestConfig) => void = () => null;

  private requestSuccessCallback: (response: HttpResponse) => void = () => null;

  private requestErrorCallback: (error: HttpError) => void = () => null;

  private requestFinishCallback: () => void = () => null;

  private requestObserver: HttpRequestObserver | undefined;

  constructor(
    private isHandlerEnabled = true,
    private attachToken: (request: HttpRequestConfig) => Promise<void> = (): Promise<void> => Promise.resolve(),
  ) {}

  /**
   * Implemented by subclasses. Performs the actual HTTP call with no handler
   * logic applied — that is handled by `request()`.
   */
  protected abstract transport<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Public HTTP request entry point. Applies pre/post processing around `transport()`.
   */
  async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const processedConfig: HttpRequestConfig = await this.requestHandler(config);
    let sent = false;
    try {
      const response: HttpResponse<T> = await this.transport<T>(processedConfig);
      sent = true;
      if (config.observe !== false) {
        this.observe(processedConfig, {
          headers: response.headers ? {...response.headers} : undefined,
          ok: true,
          status: response.status,
        });
      }
      return this.successHandler(response);
    } catch (error: any) {
      // A failure after the transport, such as in a success callback, was already observed as a success.
      if (!sent && config.observe !== false) {
        this.observe(processedConfig, {error: error as HttpError, ok: false});
      }
      this.errorHandler(error as HttpError);
      throw error;
    }
  }

  /**
   * Sets the one observer that sees every request and how it ended, or removes it with `undefined`.
   */
  setHttpRequestObserver(observer: HttpRequestObserver | undefined): void {
    this.requestObserver = observer;
  }

  enableHandler(): void {
    this.isHandlerEnabled = true;
  }

  disableHandler(): void {
    this.isHandlerEnabled = false;
  }

  disableHandlerWithTimeout(timeout: number = HttpClient.DEFAULT_HANDLER_DISABLE_TIMEOUT): void {
    this.isHandlerEnabled = false;
    setTimeout(() => {
      this.isHandlerEnabled = true;
    }, timeout);
  }

  setHttpRequestStartCallback(cb: (req: HttpRequestConfig) => void): void {
    this.requestStartCallback = cb;
  }

  setHttpRequestSuccessCallback(cb: (res: HttpResponse) => void): void {
    this.requestSuccessCallback = cb;
  }

  setHttpRequestErrorCallback(cb: (err: HttpError) => void): void {
    this.requestErrorCallback = cb;
  }

  setHttpRequestFinishCallback(cb: () => void): void {
    this.requestFinishCallback = cb;
  }

  private observe(config: HttpRequestConfig, outcome: HttpRequestOutcome): void {
    try {
      this.requestObserver?.(config, outcome);
    } catch {
      // An observer never affects the request.
    }
  }

  all<T>(values: (T | Promise<T>)[]): Promise<T[]> {
    return Promise.all(values);
  }

  spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R {
    return (array: T[]) => callback(...array);
  }

  protected async requestHandler(config: HttpRequestConfig): Promise<HttpRequestConfig> {
    if (config.attachToken !== false) {
      await this.attachToken(config);
    }

    if (config.shouldEncodeToFormData && config.data) {
      const formData: FormData = new FormData();
      Object.keys(config.data).forEach((key: string) => formData.append(key, config.data[key]));

      config.data = formData;
    }

    config.startTimeInMs = Date.now();

    if (this.isHandlerEnabled && typeof this.requestStartCallback === 'function') {
      this.requestStartCallback(config);
    }

    return config;
  }

  protected successHandler(response: HttpResponse): HttpResponse {
    if (this.isHandlerEnabled) {
      if (typeof this.requestSuccessCallback === 'function') {
        this.requestSuccessCallback(response);
      }
      if (typeof this.requestFinishCallback === 'function') {
        this.requestFinishCallback();
      }
    }
    return response;
  }

  protected errorHandler(error: HttpError): void {
    if (this.isHandlerEnabled) {
      if (typeof this.requestErrorCallback === 'function') {
        this.requestErrorCallback(error);
      }
      if (typeof this.requestFinishCallback === 'function') {
        this.requestFinishCallback();
      }
    }
  }
}
