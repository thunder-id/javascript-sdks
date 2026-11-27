// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import createApiResponseError from '../../utils/createApiResponseError';

/**
 * One credential to set for the signed-in user.
 */
export interface UpdateMeCredentialsPayload {
  /**
   * The credential's current value. Required when the user holds the credential, and not used when
   * the user sets it for the first time.
   */
  currentValue?: string;
  /**
   * The credential attribute the user type's schema declares, such as `password` or `pin`.
   */
  name: string;
  /**
   * The value to set.
   */
  newValue: string;
}

/**
 * Configuration for the updateMeCredentials request
 */
export interface UpdateMeCredentialsConfig extends Omit<RequestInit, 'method' | 'body'> {
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
   * The credential to set: its name, its current value when the user holds it, and the new value.
   */
  payload: UpdateMeCredentialsPayload;
  /**
   * The absolute API endpoint.
   */
  url?: string;
}

/**
 * Sets one of the signed-in user's credentials at the /users/me/update-credentials endpoint.
 *
 * - When the user holds the credential, give its current value in `currentValue`. The server answers
 *   `400` with the code `USR-1047` when it is missing, and `403` with `USR-1048` when it does not match.
 * - When the user does not hold it yet, `currentValue` is not needed, but the request needs a recent
 *   sign-in. Otherwise the server answers `401` with the code `AUTH-4011`, and the thrown error's
 *   `authenticationChallenge.maxAge` says how recent: sign the user in again with that `max_age` and
 *   retry.
 *
 * Replacing a credential the user holds revokes the user's tokens, including the one that made the
 * request. The endpoint responds with `204 No Content` on success, so this function resolves with
 * `void`.
 *
 * @param config - Configuration object with URL, payload and optional request config.
 * @returns A promise that resolves once the credentials have been updated.
 * @example
 * ```typescript
 * // Using default fetch
 * await updateMeCredentials({
 *   url: "https://localhost:8090/users/me/update-credentials",
 *   payload: {name: "password", currentValue: "0ldP@ssword!", newValue: "n3wP@ssword!"}
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using custom fetcher (e.g. an httpClient that attaches the access token)
 * await updateMeCredentials({
 *   baseUrl: "https://localhost:8090",
 *   payload: {name: "password", currentValue: "0ldP@ssword!", newValue: "n3wP@ssword!"},
 *   fetcher: async (url, config) => {
 *     const response = await httpClient({url, method: config.method, headers: config.headers, data: config.body});
 *     return {
 *       ok: response.status >= 200 && response.status < 300,
 *       status: response.status,
 *       statusText: response.statusText,
 *       headers: new Headers(response.headers),
 *       json: () => Promise.resolve(response.data),
 *       text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
 *     } as Response;
 *   }
 * });
 * ```
 */
const updateMeCredentials = async ({
  url,
  baseUrl,
  payload,
  fetcher,
  ...requestConfig
}: UpdateMeCredentialsConfig): Promise<void> => {
  try {
    // eslint-disable-next-line no-new
    new URL((url ?? baseUrl)!);
  } catch (error) {
    throw new ThunderIDAPIError(
      `Invalid URL provided. ${error instanceof Error ? error.message : String(error)}`,
      'updateMeCredentials-ValidationError-001',
      'javascript',
      400,
      'The provided `url` or `baseUrl` path does not adhere to the URL schema.',
    );
  }

  if (!payload?.name?.trim() || !payload?.newValue) {
    throw new ThunderIDAPIError(
      'Both a credential name and a new value are required.',
      'updateMeCredentials-ValidationError-002',
      'javascript',
      400,
      'The `payload` must carry a non-empty `name` and `newValue`.',
    );
  }

  const fetchFn: typeof fetch = fetcher ?? fetch;
  const resolvedUrl: string = url ?? `${baseUrl?.replace(/\/$/, '')}/users/me/update-credentials`;

  const requestInit: RequestInit = {
    ...requestConfig,
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      ...(payload.currentValue ? {currentValue: payload.currentValue} : {}),
      newValue: payload.newValue,
    }),
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

      throw createApiResponseError('updateMeCredentials', errorText, response, 'Failed to update user credentials');
    }
  } catch (error) {
    if (error instanceof ThunderIDAPIError) {
      throw error;
    }

    throw new ThunderIDAPIError(
      `Network or parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'updateMeCredentials-NetworkError-001',
      'javascript',
      0,
      'Network Error',
    );
  }
};

export default updateMeCredentials;
