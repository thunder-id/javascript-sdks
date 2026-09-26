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
