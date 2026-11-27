// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  User,
  createHttpClientFetcher,
  updateMeProfile as baseUpdateMeProfile,
  UpdateMeProfileConfig as BaseUpdateMeProfileConfig,
} from '@thunderid/browser';

/**
 * Configuration for the updateMeProfile request (React-specific)
 */
export interface UpdateMeProfileConfig extends Omit<BaseUpdateMeProfileConfig, 'fetcher'> {
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
 * Updates the user profile information at the specified /users/me endpoint.
 * This function uses the ThunderID SPA client's httpClient by default, but allows for custom fetchers.
 *
 * @param config - Configuration object with URL, payload and optional request config.
 * @returns A promise that resolves with the updated user profile information.
 * @example
 * ```typescript
 * // Using default ThunderID SPA client httpClient
 * await updateMeProfile({
 *   url: "https://localhost:8090/users/me",
 *   payload: { picture: "https://example.com/pic.jpg" }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using custom fetcher
 * await updateMeProfile({
 *   url: "https://localhost:8090/users/me",
 *   payload: { picture: "https://example.com/pic.jpg" },
 *   fetcher: customFetchFunction
 * });
 * ```
 */
const updateMeProfile = async ({fetcher, instanceId = 0, ...requestConfig}: UpdateMeProfileConfig): Promise<User> => {
  return baseUpdateMeProfile({
    ...requestConfig,
    // Keeps a refused response, so the server's error, such as a step-up challenge, reaches the caller.
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });
};

export default updateMeProfile;
