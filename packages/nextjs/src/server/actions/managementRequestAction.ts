// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {getManagementCollectionUrls, matchManagementUrl} from '@thunderid/node';
import getSessionId from './getSessionId';
import {ThunderIDNextConfig} from '../../models/config';
import getClient from '../getClient';

/**
 * Request from the browser: one management API request as the core API function built it. It carries
 * no token or session; the session comes from the request cookie, and the URL must address one of
 * the configured management collections.
 */
export interface ManagementRequestActionRequest {
  /**
   * JSON request body, already serialized.
   */
  body?: string;
  method?: string;
  url: string;
}

/**
 * The upstream reply, as plain data that can cross the server action boundary. A failure carries a
 * message built on the server and the status, never the text of the upstream reply.
 */
export interface ManagementRequestActionResult {
  body: string;
  status: number;
  statusText: string;
}

const ALLOWED_METHODS: readonly string[] = ['DELETE', 'GET', 'POST', 'PUT'];

/** Large enough for any management payload, small enough that the action cannot be used to stream data. */
const MAX_BODY_LENGTH: number = 1024 * 1024;

const failure = (status: number): ManagementRequestActionResult => ({
  body: `Management request failed (HTTP ${status}).`,
  status,
  statusText: '',
});

/**
 * Performs one management API request with the signed-in user's server-held session, so the access
 * token never reaches the browser. Used as the `http.fetcher` of the admin components and hooks.
 *
 * A server action is a public endpoint, so everything the caller sends is checked here rather than
 * trusted from its TypeScript type: the method must be one the management API uses, the body must be
 * a bounded string, and the URL must address a configured management collection on the configured
 * host, so the bearer token is only ever sent where the SDK would have sent it.
 *
 * Never throws across the server action boundary; failures are mapped to a plain result.
 */
const managementRequestAction = async (
  request: ManagementRequestActionRequest,
): Promise<ManagementRequestActionResult> => {
  const {
    body,
    method: rawMethod,
    url: rawUrl,
  } = (request ?? {}) as Partial<Record<keyof ManagementRequestActionRequest, unknown>>;
  const method: string = typeof rawMethod === 'string' ? rawMethod.toUpperCase() : 'GET';

  if (
    !ALLOWED_METHODS.includes(method) ||
    (body !== undefined && (typeof body !== 'string' || body.length > MAX_BODY_LENGTH))
  ) {
    return failure(400);
  }

  const sessionId: string | undefined = await getSessionId();

  if (!sessionId) {
    return failure(401);
  }

  try {
    const client = getClient();

    if (!client.isInitialized) {
      await client.initialize({} as ThunderIDNextConfig);
    }

    // The storage manager may hand the configuration back as a promise.
    const config: ThunderIDNextConfig = await Promise.resolve(client.getConfiguration());
    const url: URL | undefined = matchManagementUrl(rawUrl, getManagementCollectionUrls(config));

    if (!url) {
      return failure(400);
    }

    let accessToken: string;

    try {
      accessToken = await client.getAccessToken(sessionId);
    } catch {
      return failure(401);
    }

    const response: Response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? {'Content-Type': 'application/json'} : {}),
      },
      method,
      // A redirect could carry the request to a host the URL check never saw.
      redirect: 'error',
      ...(body !== undefined ? {body} : {}),
    });

    if (!response.ok) {
      return {...failure(response.status), statusText: response.statusText ?? ''};
    }

    return {body: await response.text(), status: response.status, statusText: response.statusText ?? ''};
  } catch {
    // Not logged: a management operation reports failure to its caller and leaves logging to the application.
    return failure(502);
  }
};

export default managementRequestAction;
