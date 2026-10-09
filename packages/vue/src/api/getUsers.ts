// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  createHttpClientFetcher,
  getUsers as baseGetUsers,
  GetUsersConfig as BaseGetUsersConfig,
  ManagedUserListResponse,
} from '@thunderid/browser';

/**
 * Configuration for the getUsers request (Vue-specific)
 */
export interface GetUsersConfig extends Omit<BaseGetUsersConfig, 'fetcher'> {
  /**
   * Optional custom fetcher function. If not provided, the ThunderID SPA client's httpClient will be used
   * which is a wrapper around axios http.request
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * Optional instance ID for multi-instance support. Defaults to 0.
   */
  instanceId?: number;
}

/**
 * Retrieves one page of the user directory. Uses the ThunderID SPA client's httpClient by default,
 * which attaches the access token, but allows a custom fetcher.
 *
 * @param config - Configuration object with URL, paging options and optional request config.
 * @returns A promise that resolves with one page of the user directory.
 * @example
 * ```typescript
 * const page = await getUsers({
 *   baseUrl: "https://localhost:8090",
 *   limit: 30,
 *   offset: 0,
 * });
 * ```
 */
const getUsers = async ({
  fetcher,
  instanceId = 0,
  ...requestConfig
}: GetUsersConfig): Promise<ManagedUserListResponse> =>
  baseGetUsers({
    ...requestConfig,
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });

export default getUsers;
