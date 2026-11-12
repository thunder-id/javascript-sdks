// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {AuthClientConfig, FlowMetadataResponse} from '@thunderid/node';
import {createError, defineEventHandler, getQuery} from 'h3';
import type {H3Event} from 'h3';
import type {ThunderIDNuxtConfig} from '../../../../types';
import {createLogger} from '../../../../utils/log';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import loadFlowMeta from '../../../utils/loadFlowMeta';

const log: ReturnType<typeof createLogger> = createLogger('meta');

/**
 * GET /api/auth/meta
 *
 * Fetches flow metadata (design config + i18n bundle) from the `GET /flow/meta` endpoint
 * server-side, so `FlowMetaProvider` never calls the ThunderID server's `baseUrl` directly from
 * the browser — that would be a cross-origin request requiring CORS to be configured on the
 * ThunderID server. Routing it through this same-origin route instead avoids that requirement
 * entirely, mirroring `getFlowMetaAction` in `@thunderid/nextjs`.
 *
 * Accepts an optional `?language=` query parameter, used by `FlowMetaProvider.switchLanguage()`.
 *
 * Answers `204 No Content` when the server has no flow metadata endpoint, as with an OpenID Connect
 * provider other than ThunderID, and `502` with a generic message when the request fails for any
 * other reason. The upstream reply is never passed on.
 */
export default defineEventHandler(async (event: H3Event): Promise<FlowMetadataResponse | null> => {
  const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
  const configData: AuthClientConfig<ThunderIDNuxtConfig> = await client.getStorageManager().getConfigData();

  const query: Record<string, unknown> = getQuery(event);
  const language: string | undefined = typeof query.language === 'string' ? query.language : undefined;

  try {
    return await loadFlowMeta(configData, language);
  } catch (error) {
    log.error('Failed to fetch flow metadata:', error instanceof Error ? error.message : String(error));

    throw createError({statusCode: 502, statusMessage: 'Failed to load flow metadata.'});
  }
});
