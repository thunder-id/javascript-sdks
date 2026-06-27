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

import {redirect} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import type {ThunderIDSSRData, ThunderIDSessionPayload} from '../models/session';

/**
 * Read the ThunderID SSR data from `event.locals` (set by `createThunderIDHandle`)
 * and throw a SvelteKit redirect to the sign-in page if the user is not authenticated.
 *
 * Use in `+page.server.ts` or `+layout.server.ts` load functions to protect routes.
 *
 * @example
 * ```ts
 * // src/routes/dashboard/+page.server.ts
 * import { requireServerSession } from '@thunderid/svelte/server';
 *
 * export const load = (event) => {
 *   const session = requireServerSession(event);
 *   return { email: session.user?.email };
 * };
 * ```
 */
export function requireServerSession(
  event: RequestEvent,
  redirectTo?: string,
): ThunderIDSSRData {
  const ssrData: ThunderIDSSRData = event.locals.thunderid;

  if (!ssrData || !ssrData.isSignedIn) {
    redirect(307, redirectTo || '/api/auth/signin');
  }

  return ssrData;
}
