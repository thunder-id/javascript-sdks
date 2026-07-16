/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

import {VendorConstants} from '@thunderid/node';

/**
 * Shared `useState` key for the ThunderID auth state (`ThunderIDAuthState`).
 *
 * Must stay in sync across `runtime/plugins/thunderid.ts`,
 * `runtime/components/ThunderIDRoot.ts`, and
 * `runtime/middleware/defineThunderIDMiddleware.ts` — all three must resolve
 * the same `vendor` (from `useRuntimeConfig().public.thunderid.vendor`) to
 * read/write the same reactive state.
 */
export const getAuthStateKey = (vendor: string = VendorConstants.VENDOR_PREFIX): string => `${vendor}:auth`;

/**
 * Shared `useState` key for the SSR-hydrated user profile (`UserProfile | null`).
 *
 * Must stay in sync across the same three files as {@link getAuthStateKey}.
 */
export const getUserProfileStateKey = (vendor: string = VendorConstants.VENDOR_PREFIX): string =>
  `${vendor}:user-profile`;
