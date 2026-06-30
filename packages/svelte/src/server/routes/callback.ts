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
import {getLogger} from '../../logger/LoggerAdapter';
import type {ThunderIDSvelteConfig} from '../../models/config';
import ThunderIDSvelteClient from '../../ThunderIDSvelteClient';
import {resolveConfig} from '../config';
import {issueSessionCookie, verifyTempSessionToken, getTempSessionCookieName, getSessionCookieName} from '../session';

export function createCallbackHandler(config?: ThunderIDSvelteConfig): (event: {url: URL; cookies: any}) => Promise<Response> {
  const resolvedConfig: ThunderIDSvelteConfig = resolveConfig(config);
  const logger = getLogger();

  return async (event) => {
    const client: ThunderIDSvelteClient = ThunderIDSvelteClient.getInstance();

    const tempCookie: string | undefined = event.cookies.get(getTempSessionCookieName());

    if (!tempCookie) {
      return new Response(null, {status: 302, headers: {Location: resolvedConfig.afterSignInUrl || '/'}});
    }

    let sessionId: string;
    let returnTo: string | undefined;

    try {
      const tempPayload = await verifyTempSessionToken(tempCookie, resolvedConfig.sessionSecret);
      sessionId = tempPayload.sessionId;
      returnTo = tempPayload.returnTo;
    } catch {
      event.cookies.delete(getTempSessionCookieName(), {path: '/'});
      return new Response(null, {status: 302, headers: {Location: resolvedConfig.afterSignInUrl || '/'}});
    }

    const code: string | null = event.url.searchParams.get('code');
    const state: string | null = event.url.searchParams.get('state');
    const sessionState: string | null = event.url.searchParams.get('session_state');

    if (code) {
      let tokenResponse: TokenResponse;

      try {
        tokenResponse = (await client.signIn(
          {code, session_state: sessionState ?? undefined, state: state ?? undefined},
          undefined,
          sessionId,
        )) as unknown as TokenResponse;
      } catch (err: unknown) {
        const message: string = (err as any)?.message ?? String(err);
        logger.error('callback signIn failed', err instanceof Error ? err : new Error(message));
        return new Response(JSON.stringify({error: message}), {
          status: 500,
          headers: {'content-type': 'application/json'},
        });
      }

      if (tokenResponse.accessToken) {
        const sessionPayload = await issueSessionCookie(event, sessionId, tokenResponse, resolvedConfig.sessionSecret);

        event.cookies.delete(getTempSessionCookieName(), {path: '/'});

        return new Response(null, {
          status: 302,
          headers: {Location: returnTo || resolvedConfig.afterSignInUrl || '/'},
        });
      }
    }

    const error: string | null = event.url.searchParams.get('error');
    if (error) {
      return new Response(null, {status: 302, headers: {Location: `${resolvedConfig.afterSignInUrl || '/'}?error=${error}`}});
    }

    return new Response(null, {status: 302, headers: {Location: resolvedConfig.afterSignInUrl || '/'}});
  };
}
