// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export interface HttpResponse<T = any> {
  config: HttpRequestConfig;
  data: T;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}

export interface HttpError extends Error {
  code?: string;
  config?: HttpRequestConfig;
  response?: {
    data?: any;
    headers?: Record<string, string>;
    status: number;
    statusText?: string;
  };
}

export interface HttpRequestConfig extends Omit<RequestInit, 'body' | 'headers' | 'method'> {
  attachToken?: boolean;
  data?: any;
  headers?: Record<string, string>;
  method?: string;
  /**
   * Whether the request observer sees this request. Defaults to `true`; the SDK sets `false` on its
   * own sign-in and flow requests so they are never reported as the app's API calls.
   */
  observe?: boolean;
  params?: Record<string, any>;
  shouldAttachIDPAccessToken?: boolean;
  shouldEncodeToFormData?: boolean;
  startTimeInMs?: number;
  url?: string;
}
