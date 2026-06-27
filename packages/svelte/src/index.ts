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

// ── Components ──
export {default as ThunderID} from './ThunderID.svelte';
export {default as SignedIn} from './components/control/SignedIn.svelte';
export {default as SignedOut} from './components/control/SignedOut.svelte';
export {default as Loading} from './components/control/Loading.svelte';
export {default as SignInButton} from './components/actions/SignInButton.svelte';
export {default as SignOutButton} from './components/actions/SignOutButton.svelte';
export {default as SignUpButton} from './components/actions/SignUpButton.svelte';

// ── Client ──
export {default as ThunderIDSvelteClient} from './ThunderIDSvelteClient';

// ── Context ──
export {THUNDERID_KEY, USER_KEY} from './context';

// ── Composables ──
export {useThunderID} from './composables/useThunderID';
export {useUser} from './composables/useUser';

// ── Models / Types ──
export type {ThunderIDSvelteConfig} from './models/config';
export type {ThunderIDSSRData, ThunderIDSessionPayload} from './models/session';
export type {ThunderIDContext, UserContextValue} from './models/contexts';
