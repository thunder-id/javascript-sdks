// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../../errors/ThunderIDAPIError';

/**
 * The credential to set, and the proof for it.
 */
export interface UpdateMeCredentialsPayload {
  /**
   * The current value of the credential. Required by the server when the user already holds a
   * value for it. A user setting a credential for the first time has none to send.
   */
  currentValue?: string;
  /**
   * The credential attribute to set, whatever attribute the user's entity type schema declares
   * `credential: true` for (for example `password` or `pin`). One credential per call.
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
   * The credential to set, its current value, and the new value.
   */
  payload: UpdateMeCredentialsPayload;
  /**
   * The absolute API endpoint.
   */
  url?: string;
}

/**
 * Updates one of the signed-in user's credentials at the /users/me/update-credentials endpoint.
 *
 * Changing a credential the user already holds needs its current value. A credential the user
 * doesn't hold yet can be set only when the user holds no credential at all.
 *
 * The endpoint responds with `204 No Content` on success, so this function resolves with
 * `void` rather than a parsed body.
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

  const fetchFn: typeof fetch = fetcher ?? fetch;
  const resolvedUrl: string = url ?? `${baseUrl?.replace(/\/$/, '')}/users/me/update-credentials`;

  const requestInit: RequestInit = {
    ...requestConfig,
    method: 'POST',
    body: JSON.stringify(payload),
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

      throw new ThunderIDAPIError(
        errorText,
        'updateMeCredentials-ResponseError-001',
        'javascript',
        response.status,
        response.statusText,
        'Failed to update user credentials',
      );
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
