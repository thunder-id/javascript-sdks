// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/javascript';
import {AccessEvaluationRequestConfig, AuthZENConfiguration} from '../../models/access-evaluation';

type AccessEndpointKey = 'evaluation' | 'evaluations' | 'searchAction';

const METADATA_FIELDS: Record<AccessEndpointKey, keyof AuthZENConfiguration> = {
  evaluation: 'access_evaluation_endpoint',
  evaluations: 'access_evaluations_endpoint',
  searchAction: 'search_action_endpoint',
};

const trimSlash = (value: string): string => value.replace(/\/+$/, '');

/**
 * Reads the AuthZEN metadata of the server at `baseUrl` and checks that its `policy_decision_point`
 * names that server exactly (apart from a trailing slash).
 */
export const getAuthZENConfiguration = async (
  operation: string,
  {baseUrl, fetcher, signal}: Pick<AccessEvaluationRequestConfig, 'baseUrl' | 'fetcher' | 'signal'>,
): Promise<AuthZENConfiguration> => {
  const fetchFn: typeof fetch = (fetcher as typeof fetch | undefined) ?? fetch;
  let response: Response;

  try {
    response = await fetchFn(`${trimSlash(baseUrl)}/.well-known/authzen-configuration`, {
      headers: {Accept: 'application/json'},
      method: 'GET',
      signal,
    });
  } catch (error) {
    throw new ThunderIDAPIError(
      `Network or parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      `${operation}-NetworkError-001`,
      'node',
      0,
      'Network Error',
    );
  }

  if (!response.ok) {
    throw new ThunderIDAPIError(
      await response.text().catch(() => ''),
      `${operation}-MetadataError-001`,
      'node',
      response.status,
      response.statusText,
      'Reading the AuthZEN metadata failed',
    );
  }

  const metadata: AuthZENConfiguration = (await response.json()) as AuthZENConfiguration;

  if (
    typeof metadata?.policy_decision_point !== 'string' ||
    trimSlash(metadata.policy_decision_point) !== trimSlash(baseUrl)
  ) {
    throw new ThunderIDAPIError(
      'The policy_decision_point in the AuthZEN metadata does not match the configured server.',
      `${operation}-MetadataError-002`,
      'node',
    );
  }

  return metadata;
};

/**
 * Resolves an access endpoint: an explicit override, held to the origin of `baseUrl`, else the
 * server's AuthZEN metadata.
 */
const resolveEndpoint = async (
  operation: string,
  key: AccessEndpointKey,
  config: AccessEvaluationRequestConfig,
): Promise<string> => {
  const override: string | undefined = config.endpoints?.[key];

  if (override) {
    if (new URL(override).origin !== new URL(config.baseUrl).origin) {
      throw new ThunderIDAPIError(
        `The ${key} endpoint override is not on the origin of baseUrl.`,
        `${operation}-ValidationError-002`,
        'node',
        400,
      );
    }

    return override;
  }

  const endpoint: unknown = (await getAuthZENConfiguration(operation, config))[METADATA_FIELDS[key]];

  if (typeof endpoint !== 'string' || endpoint === '') {
    throw new ThunderIDAPIError(
      `The AuthZEN metadata names no ${METADATA_FIELDS[key]}.`,
      `${operation}-MetadataError-003`,
      'node',
    );
  }

  return endpoint;
};

/**
 * Posts an AuthZEN request with the `Direct-Auth-Secret` header. A `4xx` or `5xx` answer is an error
 * with the server's `error` as the message; 401, 403 and 404 keep distinct codes.
 */
const requestAccessApi = async <T>(
  operation: string,
  key: AccessEndpointKey,
  config: AccessEvaluationRequestConfig,
  body: unknown,
): Promise<T> => {
  try {
    // eslint-disable-next-line no-new
    new URL(config.baseUrl);
  } catch (error) {
    throw new ThunderIDAPIError(
      `Invalid URL provided. ${error instanceof Error ? error.message : String(error)}`,
      `${operation}-ValidationError-001`,
      'node',
      400,
      'The provided `baseUrl` does not adhere to the URL schema.',
    );
  }

  if (typeof config.secret !== 'string' || config.secret === '') {
    throw new ThunderIDAPIError(
      'The Direct-Auth-Secret is required for access evaluation.',
      `${operation}-ValidationError-003`,
      'node',
      400,
    );
  }

  const endpoint: string = await resolveEndpoint(operation, key, config);
  const fetchFn: typeof fetch = (config.fetcher as typeof fetch | undefined) ?? fetch;
  let response: Response;

  try {
    response = await fetchFn(endpoint, {
      body: JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Direct-Auth-Secret': config.secret,
      },
      method: 'POST',
      signal: config.signal,
    });
  } catch (error) {
    throw new ThunderIDAPIError(
      `Network or parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      `${operation}-NetworkError-001`,
      'node',
      0,
      'Network Error',
    );
  }

  if (!response.ok) {
    const text: string = await response.text().catch(() => '');
    let message: string = text;

    try {
      const parsed: {code?: unknown; error?: unknown} = JSON.parse(text) as {code?: unknown; error?: unknown};

      // An AuthZEN error body is `{error}`; carry it the way the server's error envelope is carried.
      if (typeof parsed?.error === 'string' && parsed.code === undefined) {
        message = JSON.stringify({code: parsed.error, message: {defaultValue: parsed.error}});
      }
    } catch {
      // Not JSON: keep the body.
    }

    let reason = 'ResponseError';

    if (response.status === 401) reason = 'UnauthorizedError';
    if (response.status === 403) reason = 'ForbiddenError';
    if (response.status === 404) reason = 'NotFoundError';

    throw new ThunderIDAPIError(
      message,
      `${operation}-${reason}-001`,
      'node',
      response.status,
      response.statusText,
      'Access evaluation failed',
    );
  }

  return (await response.json()) as T;
};

export default requestAccessApi;
