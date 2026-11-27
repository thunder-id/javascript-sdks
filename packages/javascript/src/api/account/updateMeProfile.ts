// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import createApiResponseError from '../../utils/createApiResponseError';
import {User} from '../../models/user';

/**
 * Configuration for the updateMeProfile request
 */
export interface UpdateMeProfileConfig extends Omit<RequestInit, 'method' | 'body'> {
  /**
   * The base path of the API endpoint.
   */
  baseUrl?: string;
  /**
   * Optional custom fetcher function.
   * If not provided, native fetch will be used
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * The value object to patch (PATCH value)
   */
  payload: any;
  /**
   * The absolute API endpoint.
   */
  url?: string;
}

/**
 * Updates the user profile information at the specified /users/me endpoint.
 *
 * @param config - Configuration object with URL, payload and optional request config.
 * @returns A promise that resolves with the updated user profile information.
 * @example
 * ```typescript
 * // Using default fetch
 * await updateMeProfile({
 *   url: "https://localhost:8090/users/me",
 *   payload: { mobileNumbers: ["0777933830"] }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using custom fetcher (e.g., axios-based httpClient)
 * await updateMeProfile({
 *   url: "https://localhost:8090/users/me",
 *   payload: { mobileNumbers: ["0777933830"] },
 *   fetcher: async (url, config) => {
 *     const response = await httpClient({
 *       url,
 *       method: config.method,
 *       headers: config.headers,
 *       data: config.body,
 *       ...config
 *     });
 *     // Convert axios-like response to fetch-like Response
 *     return {
 *       ok: response.status >= 200 && response.status < 300,
 *       status: response.status,
 *       statusText: response.statusText,
 *       json: () => Promise.resolve(response.data),
 *       text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
 *     } as Response;
 *   }
 * });
 * ```
 */
const updateMeProfile = async ({
  url,
  baseUrl,
  payload,
  fetcher,
  ...requestConfig
}: UpdateMeProfileConfig): Promise<User> => {
  try {
    // eslint-disable-next-line no-new
    new URL((url ?? baseUrl)!);
  } catch (error) {
    throw new ThunderIDAPIError(
      `Invalid URL provided. ${error?.toString()}`,
      'updateMeProfile-ValidationError-001',
      'javascript',
      400,
      'The provided `url` or `baseUrl` path does not adhere to the URL schema.',
    );
  }

  const data = {
    attributes: payload,
  };

  const fetchFn: typeof fetch = fetcher || fetch;
  const resolvedUrl: string = url ?? `${baseUrl}/users/me`;

  const requestInit: RequestInit = {
    ...requestConfig,
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {
      ...requestConfig.headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  try {
    const response: Response = await fetchFn(resolvedUrl, requestInit);

    if (!response?.ok) {
      const errorText: string = await response.text();

      throw createApiResponseError('updateMeProfile', errorText, response, 'Failed to update user profile');
    }

    const user: User = (await response.json()) as User;
    const attributes: Record<string, unknown> = (user['attributes'] as Record<string, unknown>) ?? {};
    return {
      ...user,
      ...attributes,
    };
  } catch (error) {
    if (error instanceof ThunderIDAPIError) {
      throw error;
    }

    throw new ThunderIDAPIError(
      error?.response?.data?.detail || 'An error occurred while updating the user profile. Please try again.',
      'updateMeProfile-NetworkError-001',
      'javascript',
      error?.data?.status,
      'Network Error',
    );
  }
};

export default updateMeProfile;
