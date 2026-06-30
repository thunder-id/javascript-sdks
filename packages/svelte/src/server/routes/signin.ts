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

import {generateSessionId} from '@thunderid/node';
import {getLogger} from '../../logger/LoggerAdapter';
import type {ThunderIDSvelteConfig} from '../../models/config';
import ThunderIDSvelteClient from '../../ThunderIDSvelteClient';
import {resolveConfig} from '../config';
import {createTempSessionToken, getTempSessionCookieName, getTempSessionCookieOptions} from '../session';

export function createSignInHandler(config?: ThunderIDSvelteConfig): (event: {url: URL; cookies: any}) => Promise<Response> {
  const resolvedConfig: ThunderIDSvelteConfig = resolveConfig(config);
  const logger = getLogger();

  return async (event) => {
    try {
      const client: ThunderIDSvelteClient = ThunderIDSvelteClient.getInstance();
      const sessionId: string = generateSessionId();

      const returnTo: string = event.url.searchParams.get('returnTo') || resolvedConfig.afterSignInUrl || '/';

      const authorizeUrl: string = await client.getAuthorizeRequestUrl(
        {client_secret: '{{clientSecret}}'},
        sessionId,
      );

      const tempToken: string = await createTempSessionToken(sessionId, resolvedConfig.sessionSecret, returnTo);

      event.cookies.set(getTempSessionCookieName(), tempToken, getTempSessionCookieOptions());

      return new Response(null, {
        status: 302,
        headers: {Location: authorizeUrl},
      });
    } catch (err: unknown) {
      const message: string = (err as any)?.message ?? String(err);
      logger.error('sign-in failed', err instanceof Error ? err : new Error(message));
      return new Response(JSON.stringify({error: message}), {
        status: 500,
        headers: {'content-type': 'application/json'},
      });
    }
  };
}
