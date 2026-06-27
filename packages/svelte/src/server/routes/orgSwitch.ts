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

import type {Organization, TokenResponse} from '@thunderid/node';
import type {ThunderIDSvelteConfig} from '../../models/config';
import ThunderIDSvelteClient from '../../ThunderIDSvelteClient';
import {verifySessionToken, issueSessionCookie, getSessionCookieName} from '../session';
import {resolveConfig} from '../config';

export function createOrgSwitchHandler(
  config?: ThunderIDSvelteConfig,
): (event: {request: Request; cookies: any; url: URL}) => Promise<Response> {
  const resolvedConfig: ThunderIDSvelteConfig = resolveConfig(config);

  return async (event) => {
    const client: ThunderIDSvelteClient = ThunderIDSvelteClient.getInstance();

    const sessionCookie: string | undefined = event.cookies.get(getSessionCookieName());
    if (!sessionCookie) {
      return new Response(null, {status: 401, statusText: 'Not authenticated'});
    }

    let sessionId: string;
    try {
      const session = await verifySessionToken(sessionCookie, resolvedConfig.sessionSecret);
      sessionId = session.sessionId;
    } catch {
      return new Response(null, {status: 401, statusText: 'Invalid session'});
    }

    let body: {organizationId?: string};
    try {
      body = (await event.request.json()) as {organizationId?: string};
    } catch {
      return new Response(JSON.stringify({error: 'Invalid request body'}), {
        status: 400,
        headers: {'content-type': 'application/json'},
      });
    }

    if (!body.organizationId) {
      return new Response(JSON.stringify({error: 'organizationId is required'}), {
        status: 400,
        headers: {'content-type': 'application/json'},
      });
    }

    const organization: Organization = {id: body.organizationId, name: '', orgHandle: ''};

    try {
      const tokenResponse: TokenResponse = (await client.switchOrganization(
        organization,
        sessionId,
      )) as unknown as TokenResponse;

      if (!tokenResponse.accessToken) {
        throw new Error('No access token in response');
      }

      await issueSessionCookie(event, sessionId, tokenResponse, resolvedConfig.sessionSecret);

      return new Response(null, {
        status: 302,
        headers: {Location: resolvedConfig.afterSignInUrl || '/'},
      });
    } catch (err: unknown) {
      const message: string = err instanceof Error ? err.message : 'Organization switch failed';
      return new Response(JSON.stringify({error: message}), {
        status: 500,
        headers: {'content-type': 'application/json'},
      });
    }
  };
}
