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

import type {BrandingPreference} from '@thunderid/node';
import type {Handle, RequestEvent} from '@sveltejs/kit';
import type {ThunderIDSvelteConfig} from '../models/config';
import type {ThunderIDSSRData, ThunderIDSessionPayload} from '../models/session';
import ThunderIDSvelteClient from '../ThunderIDSvelteClient';
import {getClient} from './getClient';
import {verifySessionToken, getSessionCookieName} from './session';
import {maybeRefreshToken} from './refresh';

export function createThunderIDHandle(config: ThunderIDSvelteConfig): Handle {
  return async ({event, resolve}) => {
    const client: ThunderIDSvelteClient = await getClient(config);

    const sessionCookie: string | undefined = event.cookies.get(getSessionCookieName());
    let session: ThunderIDSessionPayload | null = null;

    if (sessionCookie) {
      try {
        session = await verifySessionToken(sessionCookie, config.sessionSecret);

        session = await maybeRefreshToken(session, config, event);

        if (session) {
          await client.rehydrateSessionFromPayload(session);
        }
      } catch {
        event.cookies.delete(getSessionCookieName(), {path: '/'});
        session = null;
      }
    }

    const isSignedIn: boolean = session !== null && (await client.isSignedIn(session.sessionId));

    const shouldFetchBranding: boolean = config.preferences?.theme?.inheritFromBranding !== false;

    let ssrData: ThunderIDSSRData;

    if (isSignedIn && session) {
      const [user, userProfile, organization, myOrganizations, branding] = await Promise.all([
        client.getUser(session.sessionId),
        client.getUserProfile(session.sessionId),
        client.getCurrentOrganization(session.sessionId),
        config.preferences?.user?.fetchOrganizations !== false
          ? client.getMyOrganizations(session.sessionId)
          : Promise.resolve([]),
        shouldFetchBranding
          ? client.getBrandingPreference({baseUrl: config.baseUrl!}).catch(() => null)
          : Promise.resolve(null),
      ]);

      ssrData = {
        brandingPreference: (branding as BrandingPreference) ?? null,
        isSignedIn: true,
        myOrganizations: myOrganizations as any[],
        organization: organization as any,
        resolvedBaseUrl: config.baseUrl ?? null,
        session,
        user: user as any,
        userProfile: userProfile as any,
      };
    } else {
      let branding: BrandingPreference | null = null;

      if (shouldFetchBranding) {
        try {
          branding = await client.getBrandingPreference({baseUrl: config.baseUrl!});
        } catch {
          // branding fetch failed — continue without
        }
      }

      ssrData = {
        brandingPreference: branding,
        isSignedIn: false,
        myOrganizations: [],
        organization: null,
        resolvedBaseUrl: null,
        session: null,
        user: null,
        userProfile: null,
      };
    }

    event.locals.thunderid = ssrData;

    return resolve(event);
  };
}

export function loadThunderID(event: RequestEvent): ThunderIDSSRData {
  return event.locals.thunderid;
}
