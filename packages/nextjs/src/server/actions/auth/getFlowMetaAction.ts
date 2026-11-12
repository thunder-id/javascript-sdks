// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {
  FlowMetadataResponse,
  FlowMetaType,
  getFlowMeta,
  isFlowMetaUnavailableError,
  resolveResourceEndpoint,
  ThunderIDAPIError,
} from '@thunderid/node';
import {ThunderIDNextConfig} from '../../../models/config';
import logger from '../../../utils/logger';
import getClient from '../../getClient';

/**
 * Whether this server has already warned that the configured server has no flow metadata endpoint, so the warning
 * appears once rather than on every request.
 */
let hasWarnedFlowMetaUnavailable = false;

/**
 * What {@link getFlowMetaAction} returns: the flow metadata, or a plain failure. It never throws, because a thrown
 * error reaches the browser as a generic 500 and loses its prototype chain crossing the server action boundary. A
 * failure carries a message built on the server and the status, never the text of the upstream reply.
 *
 * `meta` is `null` when the server has no flow metadata endpoint, as with an OpenID Connect provider other than
 * ThunderID. That is not a failure: the components fall back to their defaults.
 */
export type GetFlowMetaActionResult =
  | {meta: FlowMetadataResponse | null; success: true}
  | {message: string; statusCode?: number; success: false};

/**
 * Server Action that fetches `GET /flow/meta` server-side.
 *
 * `FlowMetaProvider` (from `@thunderid/react`) otherwise fetches this endpoint directly from the
 * browser against `baseUrl`, which requires the ThunderID server to allow CORS for the app's
 * origin. Routing it through this action instead means the browser never talks to `baseUrl`
 * directly — the request happens server-to-server, same as `signInAction`/`signUpAction`.
 *
 * Never throws across the server action boundary; failures are mapped to a plain result. When the server has no
 * flow metadata endpoint (see `isFlowMetaUnavailableError`), the action succeeds with `meta: null` and warns once.
 *
 * @param language - Optional language override, used by `FlowMetaProvider.switchLanguage()`.
 */
const getFlowMetaAction = async (params?: {
  applicationId?: string;
  language?: string;
}): Promise<GetFlowMetaActionResult> => {
  try {
    const client = getClient();
    const config: ThunderIDNextConfig = await client.getConfiguration();

    const url: string | undefined = resolveResourceEndpoint('flowMeta', config);

    if (!url && !config?.baseUrl) {
      return {message: 'Failed to load flow metadata: no base URL is configured.', success: false};
    }

    const applicationId: string | undefined = params?.applicationId ?? config?.applicationId;

    const meta: FlowMetadataResponse = await getFlowMeta({
      baseUrl: config?.baseUrl,
      url,
      ...(applicationId ? {id: applicationId, type: FlowMetaType.App} : {}),
      ...(params?.language ? {language: params.language} : {}),
    });

    return {meta, success: true};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isFlowMetaUnavailableError(error)) {
      if (!hasWarnedFlowMetaUnavailable) {
        hasWarnedFlowMetaUnavailable = true;
        logger.warn(
          `[getFlowMetaAction] The server has no flow metadata endpoint, so the defaults are used: ${message}`,
        );
      }

      return {meta: null, success: true};
    }

    logger.error(`[getFlowMetaAction] Error fetching flow metadata: ${message}`);

    if (error instanceof ThunderIDAPIError && error.statusCode !== undefined) {
      return {
        message: `Failed to load flow metadata (HTTP ${error.statusCode}).`,
        statusCode: error.statusCode,
        success: false,
      };
    }

    return {message: 'Failed to load flow metadata.', success: false};
  }
};

export default getFlowMetaAction;
