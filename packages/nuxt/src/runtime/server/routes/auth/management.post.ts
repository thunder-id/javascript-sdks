// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getManagementCollectionUrls, matchManagementUrl} from '@thunderid/node';
import {defineEventHandler, readBody} from 'h3';
import type {H3Event} from 'h3';
import type {ThunderIDManagementRequest, ThunderIDManagementResult} from '../../../types';
import {getValidAccessToken} from '../../utils/token-refresh';
import {useRuntimeConfig} from '#imports';

const ALLOWED_METHODS: readonly string[] = ['DELETE', 'GET', 'POST', 'PUT'];

/** Large enough for any management payload, small enough that the route cannot be used to stream data. */
const MAX_BODY_LENGTH: number = 1024 * 1024;

const failure = (status: number): ThunderIDManagementResult => ({
  body: `Management request failed (HTTP ${status}).`,
  status,
  statusText: '',
});

/**
 * POST /api/auth/management
 *
 * Performs one management API request with the signed-in user's server-held session. It is the
 * `http.fetcher` of the management composables of `@thunderid/vue` when `management` is on.
 *
 * Body: `{url, method?, body?}`, as the core API function built the request. No session ID or token
 * is accepted from the browser. The method must be one the management API uses, the body a bounded
 * string, and the URL must address a configured management collection on the configured host, so the
 * bearer token is only ever sent where the SDK would have sent it.
 *
 * Response: always `200` with `{body, status, statusText}`, carrying the upstream status. A failure
 * carries a message built on the server, never the text of the upstream reply.
 */
export default defineEventHandler(async (event: H3Event): Promise<ThunderIDManagementResult> => {
  const request: Partial<Record<keyof ThunderIDManagementRequest, unknown>> =
    ((await readBody(event).catch((): undefined => undefined)) as
      | Partial<Record<keyof ThunderIDManagementRequest, unknown>>
      | undefined) ?? {};
  const {body, method: rawMethod, url: rawUrl} = request;
  const method: string = typeof rawMethod === 'string' ? rawMethod.toUpperCase() : 'GET';

  if (
    !ALLOWED_METHODS.includes(method) ||
    (body !== undefined && (typeof body !== 'string' || body.length > MAX_BODY_LENGTH))
  ) {
    return failure(400);
  }

  const {baseUrl, endpoints} = useRuntimeConfig(event).public.thunderid;
  const url: URL | undefined = matchManagementUrl(rawUrl, getManagementCollectionUrls({baseUrl, endpoints}));

  if (!url) {
    return failure(400);
  }

  let accessToken: string;

  try {
    accessToken = await getValidAccessToken(event);
  } catch {
    return failure(401);
  }

  try {
    const response: Response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? {'Content-Type': 'application/json'} : {}),
      },
      method,
      // A redirect could carry the request to a host the URL check never saw.
      redirect: 'error',
      ...(typeof body === 'string' ? {body} : {}),
    });

    if (!response.ok) {
      return {...failure(response.status), statusText: response.statusText ?? ''};
    }

    return {body: await response.text(), status: response.status, statusText: response.statusText ?? ''};
  } catch {
    // Not logged: a management operation reports failure to its caller and leaves logging to the application.
    return failure(502);
  }
});
