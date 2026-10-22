// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ApiFetcher} from '@thunderid/browser';
import NuxtAPIRoutes from '../constants/NuxtAPIRoutes';
import type {ThunderIDManagementResult} from '../types';

/**
 * The `http.fetcher` the module installs for the management composables of `@thunderid/vue` when
 * `management` is on: it sends each management request through `POST /api/auth/management`, which
 * adds the signed-in user's server-held access token, and turns the plain result back into a
 * `Response` so the core API functions can read the status (a 403 stays distinct from a 404).
 *
 * Only the URL, method and body are sent. Headers are not forwarded, since the server sets the ones
 * the management API needs.
 */
const fetchManagementFromServer: ApiFetcher = async (url: string, config: RequestInit): Promise<Response> => {
  const {body, status, statusText}: ThunderIDManagementResult = await $fetch<ThunderIDManagementResult>(
    NuxtAPIRoutes.MANAGEMENT,
    {
      body: {
        ...(typeof config?.body === 'string' ? {body: config.body} : {}),
        method: config?.method ?? 'GET',
        url,
      },
      method: 'POST',
      signal: config?.signal ?? undefined,
    },
  );

  return {
    json: () => Promise.resolve(body ? (JSON.parse(body) as unknown) : undefined),
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: () => Promise.resolve(body),
  } as Response;
};

export default fetchManagementFromServer;
