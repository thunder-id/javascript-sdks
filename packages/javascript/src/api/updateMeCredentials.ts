// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../errors/ThunderIDAPIError';

/**
 * Configuration for the updateMeCredentials request
 */
export interface UpdateMeCredentialsConfig extends Omit<RequestInit, 'method' | 'body'> {
  /**
   * The base path of the API endpoint.
   */
  baseUrl?: string;
  /**
   * The user's existing password, sent for server-side verification before the new
   * credential is written. Sent as a top-level request field rather than inside
   * `payload`, because the server's credential allowlist only accepts attributes the
   * user type schema declares as credentials.
   */
  currentPassword?: string;
  /**
   * Optional custom fetcher function.
   * If not provided, native fetch will be used
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * The credential attributes to write, keyed by credential type (e.g. `{password: '...'}`).
   */
  payload: Record<string, string>;
  /**
   * The absolute API endpoint.
   */
  url?: string;
}

/**
 * Updates the signed-in user's credentials at the specified /users/me/update-credentials endpoint.
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
 *   currentPassword: "0ldP@ssword!",
 *   payload: { password: "n3wP@ssword!" }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using custom fetcher (e.g. an httpClient that attaches the access token)
 * await updateMeCredentials({
 *   baseUrl: "https://localhost:8090",
 *   payload: { password: "n3wP@ssword!" },
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
  currentPassword,
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

  const data: Record<string, unknown> = {attributes: payload};

  if (currentPassword) {
    data['currentPassword'] = currentPassword;
  }

  const fetchFn: typeof fetch = fetcher ?? fetch;
  const resolvedUrl: string = url ?? `${baseUrl?.replace(/\/$/, '')}/users/me/update-credentials`;

  const requestInit: RequestInit = {
    ...requestConfig,
    method: 'POST',
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
