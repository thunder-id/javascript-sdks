// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ApiFetcher} from '@thunderid/node';
import managementRequestAction, {ManagementRequestActionResult} from '../server/actions/managementRequestAction';

/**
 * The `http.fetcher` that `ThunderIDProvider` hands to the admin components and hooks of
 * `@thunderid/react`: it sends each management request through {@link managementRequestAction}, which
 * adds the signed-in user's server-held access token, and turns the plain result back into a
 * `Response` so the core API functions can read the status (a 403 stays distinct from a 404).
 *
 * Only the URL, method and body cross to the server. Headers are not forwarded, since the server sets
 * the ones the management API needs, and `signal` is not forwarded because an `AbortSignal` cannot
 * cross the server action boundary.
 */
const fetchManagementFromServer: ApiFetcher = async (url: string, config: RequestInit): Promise<Response> => {
  const result: ManagementRequestActionResult = await managementRequestAction({
    ...(typeof config?.body === 'string' ? {body: config.body} : {}),
    method: config?.method ?? 'GET',
    url,
  });

  const {body, status, statusText} = result;

  return {
    json: () => Promise.resolve(body ? (JSON.parse(body) as unknown) : undefined),
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: () => Promise.resolve(body),
  } as Response;
};

export default fetchManagementFromServer;
