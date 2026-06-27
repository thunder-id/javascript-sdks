/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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

import type {RequestEvent} from '@sveltejs/kit';
import type {ThunderIDSvelteConfig} from '../models/config';
import type {ThunderIDSessionPayload} from '../models/session';
import {createSessionToken, getSessionCookieName, getSessionCookieOptions} from './session';

const REFRESH_SKEW_SECONDS = 60;

interface OIDCTokenRefreshResponse {
  access_token: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

/**
 * Attempt to refresh the access token when it is within the skew window of
 * expiry. Returns the (potentially refreshed) session payload, or null when
 * the refresh fails.
 */
export async function maybeRefreshToken(
  session: ThunderIDSessionPayload,
  config: ThunderIDSvelteConfig,
  event: Pick<RequestEvent, 'cookies'>,
): Promise<ThunderIDSessionPayload | null> {
  const now: number = Math.floor(Date.now() / 1000);

  if (!session.accessTokenExpiresAt || session.accessTokenExpiresAt - REFRESH_SKEW_SECONDS > now) {
    return session;
  }

  if (!session.refreshToken) {
    return null;
  }

  const tokenEndpoint: string = `${config.baseUrl}/oauth2/token`;

  const body: URLSearchParams = new URLSearchParams({
    client_id: config.clientId!,
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });

  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret);
  }

  let refreshed: OIDCTokenRefreshResponse;
  try {
    const res: Response = await fetch(tokenEndpoint, {
      body,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      method: 'POST',
    });

    if (!res.ok) {
      return null;
    }

    refreshed = (await res.json()) as OIDCTokenRefreshResponse;
  } catch {
    return null;
  }

  const newSessionToken: string = await createSessionToken(
    {
      accessToken: refreshed.access_token,
      accessTokenExpiresAt: now + (refreshed.expires_in ?? 3600),
      idToken: refreshed.id_token ?? session.idToken,
      organizationId: session.organizationId,
      refreshToken: refreshed.refresh_token ?? session.refreshToken,
      scopes: refreshed.scope ?? session.scopes,
      sessionId: session.sessionId,
      userId: session.sub,
    },
    config.sessionSecret,
  );

  event.cookies.set(getSessionCookieName(), newSessionToken, getSessionCookieOptions());

  return {
    ...session,
    accessToken: refreshed.access_token,
    accessTokenExpiresAt: now + (refreshed.expires_in ?? 3600),
    idToken: refreshed.id_token ?? session.idToken,
    refreshToken: refreshed.refresh_token ?? session.refreshToken,
    scopes: refreshed.scope ?? session.scopes,
  };
}

/**
 * Return a valid access token for the current request.
 *
 * Reads the session from `event.locals` (set by the handle hook), refreshes
 * it if needed, and returns a guaranteed-fresh access token.
 *
 * Throws a redirect to the sign-in page when the session is missing or the
 * refresh fails.
 */
export async function getValidAccessToken(
  event: RequestEvent,
  config: ThunderIDSvelteConfig,
): Promise<string> {
  const {loadThunderID} = await import('./load');
  const ssrData = loadThunderID(event);

  if (!ssrData.session) {
    throw new Error('Not authenticated');
  }

  const refreshed = await maybeRefreshToken(ssrData.session, config, event);

  if (!refreshed) {
    throw new Error('Session expired');
  }

  return refreshed.accessToken;
}
