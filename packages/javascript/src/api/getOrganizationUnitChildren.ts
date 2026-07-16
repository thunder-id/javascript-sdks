/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import ThunderIDAPIError from '../errors/ThunderIDAPIError';

/**
 * Represents a single organization unit entry.
 */
export interface OrganizationUnit {
  /** Optional description of the organization unit. */
  description?: string;
  /** Unique identifier of the organization unit. */
  id: string;
  /** Human-readable name of the organization unit. */
  name: string;
  /** Identifier of the parent organization unit, if any. */
  parentId?: string;
  /** Status of the organization unit (e.g. ACTIVE). */
  status?: string;
}

/**
 * Response shape for the organization unit children list endpoint.
 */
export interface OrganizationUnitListResponse {
  /** Number of items returned in this page. */
  count?: number;
  /** List of child organization units. */
  organizationUnits: OrganizationUnit[];
  /** Pagination start index (1-based). */
  startIndex?: number;
  /** Total number of matching organization units. */
  totalResults?: number;
}

/**
 * Configuration for the getOrganizationUnitChildren request.
 */
export interface GetOrganizationUnitChildrenConfig extends Omit<RequestInit, 'method'> {
  /**
   * The base URL of the ThunderID server.
   * Used to derive the endpoint when `url` is not provided.
   */
  baseUrl?: string;
  /**
   * Optional custom fetcher function.
   * If not provided, native fetch will be used.
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * Maximum number of results to return.
   */
  limit?: number;
  /**
   * Zero-based offset for pagination.
   */
  offset?: number;
  /**
   * The identifier of the parent organization unit whose children to list.
   */
  organizationUnitId: string;
  /**
   * The absolute API endpoint URL.
   * When provided, `baseUrl` and `organizationUnitId` are not used for URL construction.
   */
  url?: string;
}

/**
 * Retrieves the child organization units of a given organization unit.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the list of child organization units.
 */
const getOrganizationUnitChildren = async ({
  url,
  baseUrl,
  organizationUnitId,
  limit,
  offset,
  fetcher,
  ...requestConfig
}: GetOrganizationUnitChildrenConfig): Promise<OrganizationUnitListResponse> => {
  try {
    // eslint-disable-next-line no-new
    new URL((url ?? baseUrl)!);
  } catch (error) {
    throw new ThunderIDAPIError(
      `Invalid URL provided. ${error?.toString()}`,
      'getOrganizationUnitChildren-ValidationError-001',
      'javascript',
      400,
      'The provided `url` or `baseUrl` path does not adhere to the URL schema.',
    );
  }

  const fetchFn: typeof fetch = fetcher || fetch;

  const queryParams = new URLSearchParams();
  if (limit !== undefined) queryParams.set('limit', String(limit));
  if (offset !== undefined) queryParams.set('offset', String(offset));
  const query = queryParams.toString();

  const resolvedBase = url ?? `${baseUrl}/api/server/v1/organization-units/${organizationUnitId}/children`;
  const resolvedUrl = query ? `${resolvedBase}?${query}` : resolvedBase;

  const requestInit: RequestInit = {
    ...requestConfig,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...requestConfig.headers,
    },
    method: 'GET',
  };

  try {
    const response: Response = await fetchFn(resolvedUrl, requestInit);

    if (!response?.ok) {
      const errorText: string = await response.text();

      throw new ThunderIDAPIError(
        errorText,
        'getOrganizationUnitChildren-ResponseError-001',
        'javascript',
        response.status,
        response.statusText,
        'Failed to fetch organization unit children',
      );
    }

    return (await response.json()) as OrganizationUnitListResponse;
  } catch (error) {
    if (error instanceof ThunderIDAPIError) {
      throw error;
    }

    throw new ThunderIDAPIError(
      `Network or parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'getOrganizationUnitChildren-NetworkError-001',
      'javascript',
      0,
      'Network Error',
    );
  }
};

export default getOrganizationUnitChildren;
