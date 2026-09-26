// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../errors/ThunderIDAPIError';
import {ManagementRequestConfig} from '../models/api';

/**
 * Describes a single request against a management API resource collection.
 */
export interface ManagementResourceRequest {
  /**
   * Request payload, serialized as JSON.
   */
  body?: unknown;
  /**
   * Collection path segment appended to `baseUrl` when no `url` is given (e.g. `applications`).
   */
  collection: string;
  /**
   * Message prefix used when the server rejects the request.
   */
  failureMessage: string;
  /**
   * Identifier of a single resource. When set, the request targets `{collectionUrl}/{id}`.
   */
  id?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /**
   * Name of the calling operation, used as the prefix of every error code it raises.
   */
  operation: string;
  /**
   * Query parameters. `undefined` values are omitted.
   */
  query?: Record<string, string | number | undefined>;
}

/**
 * Performs a request against a management API resource and maps failures onto
 * {@link ThunderIDAPIError}. HTTP 403 and 404 get their own codes so a caller can tell a missing
 * permission from a missing resource.
 *
 * @returns The parsed JSON body, or `undefined` when the server returns no content.
 */
const requestManagementResource = async <T>(
  {baseUrl, url, fetcher, ...requestConfig}: ManagementRequestConfig,
  {body, collection, failureMessage, id, method, operation, query}: ManagementResourceRequest,
): Promise<T> => {
  try {
    // eslint-disable-next-line no-new
    new URL((url ?? baseUrl)!);
  } catch (error) {
    throw new ThunderIDAPIError(
      `Invalid URL provided. ${error instanceof Error ? error.message : String(error)}`,
      `${operation}-ValidationError-001`,
      'javascript',
      400,
      'The provided `url` or `baseUrl` path does not adhere to the URL schema.',
    );
  }

  if (id?.trim() === '') {
    throw new ThunderIDAPIError(
      'A resource identifier is required.',
      `${operation}-ValidationError-002`,
      'javascript',
      400,
      'The provided resource identifier is empty.',
    );
  }

  const collectionUrl: string = (url ?? `${baseUrl}/${collection}`).replace(/\/+$/, '');
  const resourceUrl: string = id === undefined ? collectionUrl : `${collectionUrl}/${encodeURIComponent(id)}`;

  const searchParams: URLSearchParams = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]: [string, string | number | undefined]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });
  const queryString: string = searchParams.toString();
  const resolvedUrl: string = queryString ? `${resourceUrl}?${queryString}` : resourceUrl;

  const requestInit: RequestInit = {
    ...requestConfig,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...requestConfig.headers,
    },
    method,
    ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
  };

  const fetchFn: typeof fetch = fetcher ?? fetch;

  try {
    const response: Response = await fetchFn(resolvedUrl, requestInit);

    if (!response?.ok) {
      const errorText: string = await response.text();
      let reason = 'ResponseError';

      if (response.status === 403) {
        reason = 'ForbiddenError';
      } else if (response.status === 404) {
        reason = 'NotFoundError';
      }

      throw new ThunderIDAPIError(
        errorText,
        `${operation}-${reason}-001`,
        'javascript',
        response.status,
        response.statusText,
        failureMessage,
      );
    }

    if (response.status === 204 || method === 'DELETE') {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ThunderIDAPIError) {
      throw error;
    }

    throw new ThunderIDAPIError(
      `Network or parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      `${operation}-NetworkError-001`,
      'javascript',
      0,
      'Network Error',
    );
  }
};

export default requestManagementResource;
