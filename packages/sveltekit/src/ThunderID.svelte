<script lang="ts">
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

  import type {
    BrandingPreference,
    GetBrandingPreferenceConfig,
    IdToken,
    SPATokenExchangeConfig,
    User,
    UserProfile,
  } from '@thunderid/browser';
  import ThunderIDSvelteClient from './ThunderIDSvelteClient';
  import type {ThunderIDSvelteKitConfig} from './models/config';
  import type {I18nPreferences} from './models/config';
  import type {ThunderIDSSRData} from './models/session';
  import type {ThunderIDContext, UserContextValue, NavigateFn} from './models/contexts';
  import type {IdTokenValidationResult} from './validation/IdTokenValidator';
  import {setThunderIDContext, setUserContext} from './context';
  import {authState} from './state.svelte';
  import {DEFAULT_BUNDLES, type TranslationBundle} from './i18n/translations';

  interface Props {
    children?: import('svelte').Snippet;
    afterSignInUrl?: string;
    afterSignOutUrl?: string;
    applicationId?: string;
    baseUrl?: string;
    clientId?: string;
    scopes?: string | string[];
    signInUrl?: string;
    signUpUrl?: string;
    ssrData?: ThunderIDSSRData;
    navigate?: NavigateFn;
    locale?: string;
    i18n?: I18nPreferences;
  }

  let {
    children,
    afterSignInUrl = undefined,
    afterSignOutUrl = undefined,
    applicationId = undefined,
    baseUrl = undefined,
    clientId = undefined,
    scopes = undefined,
    signInUrl = '/api/auth/signin',
    signUpUrl = undefined,
    ssrData = undefined,
    navigate = undefined,
    locale = undefined,
    i18n = undefined,
  }: Props = $props();

  function nav(url: string): void {
    if (navigate) {
      navigate(url);
    } else {
      window.location.href = url;
    }
  }

  function hydrateFromSSR(data: ThunderIDSSRData): void {
    authState.isSignedIn = data.isSignedIn;
    authState.isInitialized = true;

    authState.resolvedBaseUrl = data.resolvedBaseUrl ?? '';
    authState.user = data.user;
    authState.userProfile = data.userProfile;
    authState.isLoading = false;
  }

  $effect(() => {
    if (ssrData) {
      hydrateFromSSR(ssrData);
    }
  });

  function buildConfig(): ThunderIDSvelteKitConfig | null {
    if (!baseUrl || !clientId) return null;
    return {
      baseUrl,
      clientId,
      scopes,
      afterSignInUrl,
      afterSignOutUrl,
      applicationId,
      signInUrl,
      signUpUrl,
    } as ThunderIDSvelteKitConfig;
  }

  $effect(() => {
    const cfg = buildConfig();
    if (cfg) {
      ThunderIDSvelteClient.getInstance().initialize(cfg).catch(() => {});
    }
  });

  async function signIn(_options?: Record<string, unknown>): Promise<void> {
    nav(signInUrl);
  }

  async function signOut(_options?: Record<string, unknown>): Promise<void> {
    nav('/api/auth/signout');
  }

  async function signUp(_options?: Record<string, unknown>): Promise<void> {
    if (signUpUrl) {
      nav(signUpUrl);
    }
  }

  function getAccessToken(sessionId?: string): Promise<string> {
    return ThunderIDSvelteClient.getInstance().getAccessToken(sessionId);
  }

  function getIdToken(sessionId?: string): Promise<string> {
    return ThunderIDSvelteClient.getInstance().getIdToken(sessionId);
  }

  function getDecodedIdToken(sessionId?: string, idToken?: string): Promise<IdToken> {
    return ThunderIDSvelteClient.getInstance().getDecodedIdToken(sessionId, idToken);
  }

  function getUser(sessionId?: string): Promise<User> {
    return ThunderIDSvelteClient.getInstance().getUser(sessionId);
  }

  function getUserProfile(sessionId?: string): Promise<UserProfile> {
    return ThunderIDSvelteClient.getInstance().getUserProfile(sessionId);
  }

  function updateUserProfile(payload: Record<string, unknown>, userId?: string): Promise<User> {
    return ThunderIDSvelteClient.getInstance().updateUserProfile(payload, userId);
  }

  function getUserInfo(sessionId?: string): Promise<User> {
    return ThunderIDSvelteClient.getInstance().getUserInfo(sessionId);
  }

  function verifyIdToken(
    idToken: string,
    options?: {
      clientId?: string;
      issuer?: string;
      clockTolerance?: number;
      validateIssuer?: boolean;
      nonce?: string;
    },
  ): Promise<IdTokenValidationResult> {
    return ThunderIDSvelteClient.getInstance().verifyIdToken(idToken, options);
  }

  function getBrandingPreference(config: GetBrandingPreferenceConfig): Promise<BrandingPreference> {
    return ThunderIDSvelteClient.getInstance().getBrandingPreference(config);
  }

  function revokeAccessToken(userId?: string): Promise<Response | boolean> {
    return ThunderIDSvelteClient.getInstance().revokeAccessToken(userId);
  }

  function exchangeToken(config: SPATokenExchangeConfig): Promise<Response | User> {
    return ThunderIDSvelteClient.getInstance().exchangeToken(config);
  }

  async function signInSilently(options?: Record<string, unknown>): Promise<User | boolean> {
    const result = await ThunderIDSvelteClient.getInstance().signInSilently(options);
    if (result && typeof result === 'object') {
      authState.isSignedIn = true;
      authState.user = result;
    }
    return result;
  }

  async function reInitialize(config: Partial<ThunderIDSvelteKitConfig>): Promise<boolean> {
    const result = await ThunderIDSvelteClient.getInstance().reInitialize(config);
    authState.isInitialized = true;
    return result;
  }

  async function reset(): Promise<void> {
    await ThunderIDSvelteClient.getInstance().reset();
    authState.isInitialized = false;
    authState.isSignedIn = false;
    authState.user = null;
    authState.userProfile = null;

  }

  function getConfiguration(): ThunderIDSvelteKitConfig {
    return ThunderIDSvelteClient.getInstance().getConfiguration() as unknown as ThunderIDSvelteKitConfig;
  }

  let brandingPreference: ThunderIDContext['brandingPreference'] = $state(null);

  $effect(() => {
    if (ssrData?.brandingPreference) {
      brandingPreference = ssrData.brandingPreference;
    }
  });

  function mergeBundles(user: Record<string, TranslationBundle>): Record<string, TranslationBundle> {
    const merged: Record<string, TranslationBundle> = {};
    const allLocales = new Set([...Object.keys(DEFAULT_BUNDLES), ...Object.keys(user)]);
    for (const loc of allLocales) {
      merged[loc] = {...DEFAULT_BUNDLES[loc], ...user[loc]};
    }
    return merged;
  }

  let mergedBundles: Record<string, TranslationBundle> = mergeBundles({});

  $effect(() => {
    authState.locale = locale ?? i18n?.language ?? 'en';
    mergedBundles = mergeBundles((i18n?.bundles ?? {}) as Record<string, TranslationBundle>);
  });

  function t(key: string, params?: Record<string, string | number>): string {
    const lang = authState.locale;
    const fallback = i18n?.fallbackLanguage ?? 'en';
    let text = mergedBundles[lang]?.[key] ?? mergedBundles[fallback]?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
    }
    return text;
  }

  const context: ThunderIDContext = {
    get afterSignInUrl() { return afterSignInUrl; },
    get locale() { return authState.locale; },
    t,
    get afterSignOutUrl() { return afterSignOutUrl; },
    get applicationId() { return applicationId; },
    get baseUrl() { return baseUrl; },
    get brandingPreference() { return brandingPreference; },
    get clientId() { return clientId; },
    get isInitialized() { return authState.isInitialized; },
    get isLoading() { return authState.isLoading; },
    get isSignedIn() { return authState.isSignedIn; },

    get resolvedBaseUrl() { return authState.resolvedBaseUrl; },
    get scopes() { return scopes; },
    get signInUrl() { return signInUrl; },
    get signUpUrl() { return signUpUrl; },
    get user() { return authState.user; },
    get userProfile() { return authState.userProfile; },
    signIn,
    signOut,
    signUp,
    getAccessToken,
    getIdToken,
    getDecodedIdToken,
    getUser,
    getUserProfile,
    updateUserProfile,
    getUserInfo,
    verifyIdToken,
    getBrandingPreference,
    revokeAccessToken,

    exchangeToken,
    signInSilently,
    reInitialize,
    reset,
    getConfiguration,
  };

  setThunderIDContext(context);

  const userContext: UserContextValue = {
    get profile() { return authState.userProfile; },
    get flattenedProfile() { return authState.user; },
    get schemas() { return authState.userProfile?.schemas ?? null; },
  };

  setUserContext(userContext);
</script>

{@render children?.()}
