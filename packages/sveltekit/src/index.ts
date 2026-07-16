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
export {default as Callback} from './components/auth/Callback.svelte';
export {default as BaseSignInButton} from './components/actions/BaseSignInButton.svelte';
export {default as BaseSignOutButton} from './components/actions/BaseSignOutButton.svelte';
export {default as BaseSignUpButton} from './components/actions/BaseSignUpButton.svelte';

// ── Presentation Components ──
export {default as UserProfile} from './components/presentation/UserProfile.svelte';
export {default as BaseUserProfile} from './components/presentation/BaseUserProfile.svelte';
export {default as User} from './components/presentation/User.svelte';
export {default as BaseUser} from './components/presentation/BaseUser.svelte';
export {default as SignIn} from './components/presentation/SignIn.svelte';
export {default as BaseSignIn} from './components/presentation/BaseSignIn.svelte';
export {default as SignUp} from './components/presentation/SignUp.svelte';
export {default as BaseSignUp} from './components/presentation/BaseSignUp.svelte';
export {default as AcceptInvite} from './components/presentation/AcceptInvite.svelte';
export {default as BaseAcceptInvite} from './components/presentation/BaseAcceptInvite.svelte';
export {default as InviteUser} from './components/presentation/InviteUser.svelte';
export {default as BaseInviteUser} from './components/presentation/BaseInviteUser.svelte';
export {default as UserDropdown} from './components/presentation/UserDropdown.svelte';
export {default as BaseUserDropdown} from './components/presentation/BaseUserDropdown.svelte';
export {default as LanguageSwitcher} from './components/presentation/LanguageSwitcher.svelte';
export {default as BaseLanguageSwitcher} from './components/presentation/BaseLanguageSwitcher.svelte';

// ── Client ──
export {default as ThunderIDSvelteClient} from './ThunderIDSvelteClient';

// ── Context ──
export {THUNDERID_KEY, USER_KEY, setThunderIDContext, setUserContext} from './context';

// ── Composables ──
export {useThunderID} from './composables/useThunderID';
export {useUser} from './composables/useUser';

// ── State ──
export {authState} from './state.svelte';

// ── Models / Types ──
export type {ThunderIDSvelteKitConfig, ThunderIDSveltePreferences, ThemePreferences, I18nPreferences} from './models/config';
export type {ThunderIDSSRData, ThunderIDSessionPayload} from './models/session';
export type {BrandingPreference} from '@thunderid/browser';
export type {ThunderIDContext, UserContextValue, NavigateFn} from './models/contexts';

// ── Errors ──
export {IAMError, ErrorCode} from './errors/IAMError';

// ── Logger ──
export {DefaultLogger, setLogger, getLogger} from './logger/LoggerAdapter';
export type {LoggerAdapter} from './logger/LoggerAdapter';
export {sanitizeForLog, sanitizeTokenForLog} from './logger/sanitizer';

// ── Adapters ──
export type {StorageAdapter} from './adapters/StorageAdapter';
export {DefaultStorage} from './adapters/StorageAdapter';
export type {HTTPAdapter, HTTPResponse} from './adapters/HTTPAdapter';
export {DefaultHTTPAdapter} from './adapters/HTTPAdapter';

// ── Events ──
export {SDKEvent, on, off, emit, clearListeners} from './events/EventBus';
export type {SDKEventListener} from './events/EventBus';

// ── Validation ──
export {verifyIdToken, validateIdTokenClaims, clearJWKSCache} from './validation/IdTokenValidator';
export type {IdTokenValidationResult} from './validation/IdTokenValidator';

// ── i18n ──
export {createTranslator, DEFAULT_BUNDLES} from './i18n/translations';
export type {TranslationBundle, TranslationBundles} from './i18n/translations';

// ── Server ──
export {createThunderIDHandle, loadThunderID} from './server/hooks';
export {resolveConfig} from './server/config';
export {requireServerSession, isGuardRedirect, GuardRedirect} from './server/guard';
export {getClient, resetClient} from './server/getClient';
export {getValidAccessToken, maybeRefreshToken} from './server/refresh';
export {createSignInHandler} from './server/routes/signin';
export {createCallbackHandler} from './server/routes/callback';
export {createSignOutHandler} from './server/routes/signout';
export {
  createSessionToken,
  createTempSessionToken,
  verifySessionToken,
  verifyTempSessionToken,
  getSessionCookieName,
  getTempSessionCookieName,
  getSessionCookieOptions,
  getTempSessionCookieOptions,
  issueSessionCookie,
} from './server/session';
