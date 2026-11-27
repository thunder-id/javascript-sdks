// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * A fetch-compatible function used to perform HTTP requests. Supply one to route a request through
 * your own transport (for example an authenticated HTTP client) instead of the global `fetch`.
 */
export type ApiFetcher = (url: string, config: RequestInit) => Promise<Response>;

/**
 * Common options accepted by every management API function.
 */
export interface ManagementRequestConfig extends Omit<RequestInit, 'method' | 'body'> {
  /**
   * The base URL of the ThunderID resource server. Used to derive the collection URL
   * (e.g. `{baseUrl}/applications`) when `url` is not provided.
   */
  baseUrl?: string;
  /**
   * Optional custom fetcher function. If not provided, the global `fetch` is used.
   */
  fetcher?: ApiFetcher;
  /**
   * The absolute URL of the resource collection (e.g. `https://rs.example.com/applications`).
   * Takes precedence over `baseUrl`. A single resource is addressed by appending its identifier.
   */
  url?: string;
}

/**
 * Pagination and filtering parameters accepted by list endpoints.
 */
export interface ApiFilteringParams {
  /**
   * An expression understood by the server to narrow the results.
   */
  filter?: string;
  /**
   * Maximum number of records to return.
   */
  limit?: number;
  /**
   * Number of records to skip.
   */
  offset?: number;
}

/**
 * A pagination link returned alongside a list response.
 */
export interface ApiPaginationLink {
  href: string;
  rel: string;
}

/**
 * The error envelope returned by the ThunderID management API.
 */
export interface ApiError {
  code: string;
  description: string;
  message: string;
}

/**
 * A localizable message in a server error: its translation key, its English text, and the values its
 * placeholders take.
 */
export interface ServerErrorMessage {
  defaultValue?: string;
  key?: string;
  params?: Record<string, string>;
}

/**
 * The error envelope the ThunderID server returns with a failed request.
 */
export interface ServerError {
  /**
   * The server's error code, such as `USR-1027`.
   */
  code: string;
  description?: ServerErrorMessage;
  message?: ServerErrorMessage;
}

/**
 * A `WWW-Authenticate: Bearer` challenge that asks for a more recent sign-in (RFC 9470), such as the one
 * the self-service APIs return when a change needs one. Sign the user in again with `maxAge` as the
 * `max_age` authorization parameter, or with `prompt=login`, and retry the request with the new token.
 */
export interface AuthenticationChallenge {
  /**
   * The challenge's `error`, such as `insufficient_user_authentication`.
   */
  error: string;
  /**
   * The challenge's `error_description`, when the server sent one.
   */
  errorDescription?: string;
  /**
   * The challenge's `max_age`: how recent, in seconds, the sign-in must be.
   */
  maxAge?: number;
}
