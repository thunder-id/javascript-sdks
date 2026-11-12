// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowMetaType, getFlowMeta, isFlowMetaUnavailableError, resolveResourceEndpoint} from '@thunderid/node';
import type {FlowMetadataResponse, ResourceEndpointConfig} from '@thunderid/node';
import {createLogger} from '../../utils/log';

const log: ReturnType<typeof createLogger> = createLogger('flow-meta');

/**
 * Whether this server has already warned that the configured server has no flow metadata endpoint, so the warning
 * appears once rather than on every page load.
 */
let hasWarnedUnavailable = false;

/**
 * Fetches flow metadata (design config and i18n bundle) from `GET /flow/meta` on the server.
 *
 * Resolves to `null` when the server has no flow metadata endpoint, as with an OpenID Connect provider other than
 * ThunderID (see `isFlowMetaUnavailableError`). That is warned about once and then logged at debug level, and the
 * components fall back to their defaults. Any other failure, such as a network error or a ThunderID error, rejects.
 */
const loadFlowMeta = async (
  config: (ResourceEndpointConfig & {applicationId?: string; baseUrl?: string}) | undefined,
  language?: string,
): Promise<FlowMetadataResponse | null> => {
  try {
    return await getFlowMeta({
      baseUrl: config?.baseUrl,
      url: resolveResourceEndpoint('flowMeta', config),
      ...(config?.applicationId ? {id: config.applicationId, type: FlowMetaType.App} : {}),
      ...(language ? {language} : {}),
    });
  } catch (error) {
    if (!isFlowMetaUnavailableError(error)) {
      throw error;
    }

    const message = `The server has no flow metadata endpoint, so the defaults are used: ${(error as Error).message}`;

    if (hasWarnedUnavailable) {
      log.debug(message);
    } else {
      hasWarnedUnavailable = true;
      log.warn(message);
    }

    return null;
  }
};

export default loadFlowMeta;
