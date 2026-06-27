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

import type {TokenResponse} from '@thunderid/node';
import type {ThunderIDSvelteConfig} from '../../models/config';
import ThunderIDSvelteClient from '../../ThunderIDSvelteClient';
import {issueSessionCookie, verifyTempSessionToken, getTempSessionCookieName, getSessionCookieName} from '../session';

export function createCallbackHandler(config: ThunderIDSvelteConfig): (event: {url: URL; cookies: any}) => Promise<Response> {
  return async (event) => {
    const client: ThunderIDSvelteClient = ThunderIDSvelteClient.getInstance();

    const tempCookie: string | undefined = event.cookies.get(getTempSessionCookieName());

    if (!tempCookie) {
      return new Response(null, {status: 302, headers: {Location: config.afterSignInUrl || '/'}});
    }

    let sessionId: string;
    let returnTo: string | undefined;

    try {
      const tempPayload = await verifyTempSessionToken(tempCookie, config.sessionSecret);
      sessionId = tempPayload.sessionId;
      returnTo = tempPayload.returnTo;
    } catch {
      event.cookies.delete(getTempSessionCookieName(), {path: '/'});
      return new Response(null, {status: 302, headers: {Location: config.afterSignInUrl || '/'}});
    }

    const code: string | null = event.url.searchParams.get('code');
    const state: string | null = event.url.searchParams.get('state');
    const sessionState: string | null = event.url.searchParams.get('session_state');

    if (code) {
      const tokenResponse: TokenResponse = (await client.signIn(
        {code, session_state: sessionState ?? undefined, state: state ?? undefined},
        undefined,
        sessionId,
      )) as unknown as TokenResponse;

      if (tokenResponse.accessToken) {
        const sessionPayload = await issueSessionCookie(event, sessionId, tokenResponse, config.sessionSecret);

        event.cookies.delete(getTempSessionCookieName(), {path: '/'});

        return new Response(null, {
          status: 302,
          headers: {Location: returnTo || config.afterSignInUrl || '/'},
        });
      }
    }

    const error: string | null = event.url.searchParams.get('error');
    if (error) {
      return new Response(null, {status: 302, headers: {Location: `${config.afterSignInUrl || '/'}?error=${error}`}});
    }

    return new Response(null, {status: 302, headers: {Location: config.afterSignInUrl || '/'}});
  };
}
