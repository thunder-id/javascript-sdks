// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import {FlowMetadataResponse, GetFlowMetaRequestConfig} from '../../models/flow-meta';

/**
 * Fetches aggregated flow metadata from the `GET /flow/meta` endpoint.
 *
 * The response includes:
 * - Application or OU details depending on the `type` parameter
 * - Resolved design configuration (theme and layout)
 * - i18n translations filtered by `language` and `namespace`
 * - Registration flow enablement status
 *
 * @param config - Request configuration including `baseUrl`/`url`, and optional
 *                 `type`, `id`, `language`, and `namespace` filters. When `type`
 *                 and `id` are omitted the server returns i18n-only metadata.
 * @returns A promise that resolves to the {@link FlowMetadataResponse}.
 *
 * @throws {ThunderIDAPIError} When the server returns a non-OK response, or an OK response whose body is not JSON.
 * Use {@link isFlowMetaUnavailableError} to tell a server that has no flow metadata endpoint, such as an OpenID
 * Connect provider other than ThunderID, from a real failure.
 *
 * @example
 * ```typescript
 * import getFlowMeta from './api/auth/getFlowMeta';
 * import { FlowMetaType } from './models/flow-meta';
 *
 * const meta = await getFlowMeta({
 *   baseUrl: 'https://localhost:8090',
 *   type: FlowMetaType.App,
 *   id: '60a9b38b-6eba-9f9e-55f9-267067de4680',
 *   language: 'en',
 *   namespace: 'auth',
 * });
 *
 * console.log(meta.application?.name);
 * console.log(meta.i18n.translations);
 * ```
 *
 * @experimental This function targets the ThunderID V2 platform API
 */
const getFlowMeta = async ({
  url,
  baseUrl,
  type,
  id,
  language,
  namespace,
  ...requestConfig
}: GetFlowMetaRequestConfig): Promise<FlowMetadataResponse> => {
  const queryParams: URLSearchParams = new URLSearchParams({
    ...(id ? {id} : {}),
    ...(type ? {type} : {}),
    ...(language ? {language} : {}),
    ...(namespace ? {namespace} : {}),
  });

  const baseEndpoint: string = url ?? `${baseUrl}/flow/meta`;
  const endpoint = `${baseEndpoint}?${queryParams.toString()}`;

  const response: Response = await fetch(endpoint, {
    ...requestConfig,
    headers: {
      Accept: 'application/json',
      ...requestConfig.headers,
    },
    method: 'GET',
  });

  if (!response.ok) {
    const errorText: string = await response.text();

    throw new ThunderIDAPIError(
      errorText,
      'getFlowMeta-ResponseError-001',
      'javascript',
      response.status,
      response.statusText,
      'Flow metadata request failed',
    );
  }

  try {
    return (await response.json()) as FlowMetadataResponse;
  } catch {
    // A server that does not implement this endpoint can still answer 2xx, for example with an HTML page.
    throw new ThunderIDAPIError(
      'The response body is not JSON.',
      'getFlowMeta-InvalidResponseError-001',
      'javascript',
      response.status,
      response.statusText,
      'Flow metadata request failed',
    );
  }
};

export default getFlowMeta;
