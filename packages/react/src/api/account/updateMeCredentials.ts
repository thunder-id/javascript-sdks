// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  createHttpClientFetcher,
  updateMeCredentials as baseUpdateMeCredentials,
  UpdateMeCredentialsConfig as BaseUpdateMeCredentialsConfig,
} from '@thunderid/browser';

/**
 * Configuration for the updateMeCredentials request (React-specific)
 */
export interface UpdateMeCredentialsConfig extends Omit<BaseUpdateMeCredentialsConfig, 'fetcher'> {
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
 * Updates one of the signed-in user's credentials at the /users/me/update-credentials
 * endpoint. Uses the ThunderID SPA client's httpClient by default, which attaches the access
 * token, but allows a custom fetcher.
 *
 * @param config - Configuration object with URL, payload and optional request config.
 * @returns A promise that resolves once the credentials have been updated.
 * @example
 * ```typescript
 * await updateMeCredentials({
 *   url: "https://localhost:8090/users/me/update-credentials",
 *   payload: {name: "password", currentValue: "0ldP@ssword!", newValue: "n3wP@ssword!"}
 * });
 * ```
 */
const updateMeCredentials = async ({
  fetcher,
  instanceId = 0,
  ...requestConfig
}: UpdateMeCredentialsConfig): Promise<void> => {
  return baseUpdateMeCredentials({
    ...requestConfig,
    fetcher: fetcher || createHttpClientFetcher(instanceId),
  });
};

export default updateMeCredentials;
