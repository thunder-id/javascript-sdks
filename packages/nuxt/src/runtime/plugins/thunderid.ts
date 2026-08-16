// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getRedirectBasedSignUpUrl, getVendorPrefix} from '@thunderid/browser';
import type {AttributeSchema, UserProfile} from '@thunderid/node';
import {ThunderIDPlugin, THUNDERID_KEY} from '@thunderid/vue';
import type {H3Event} from 'h3';
import {computed} from 'vue';
import type {ComputedRef, Ref} from 'vue';
import ThunderIDRoot from '../components/ThunderIDRoot';
import type {ThunderIDAuthState, ThunderIDSSRData} from '../types';
import {getAuthStateKey, getUserProfileStateKey, getUserSchemaStateKey} from '../utils/stateKeys';
import type {NuxtApp} from '#app';
import {defineNuxtPlugin, useState, useRequestEvent, useRuntimeConfig, navigateTo} from '#app';

/**
 * Universal Nuxt plugin (runs on both server and client) that wires up the
 * ThunderID Vue SDK.
 *
 * Responsibilities — mirrors the split between `ThunderIDServerProvider` and
 * `ThunderIDClientProvider` in the Next.js SDK:
 *
 *  1. **Auth state** — hydrate `useState(getAuthStateKey(vendor))` (default
 *     key: `'thunderid:auth'`) from the Nitro plugin's `event.context[vendor]`
 *     so SSR and client agree on signed-in status and the user object.
 *  2. **THUNDERID_KEY** — provide the primary auth context at the app level.
 *     Action helpers (`signIn` / `signOut` / `signUp`) use Nuxt's
 *     `navigateTo` so redirects work on both server and client.
 *  3. **ThunderIDRoot** — register the wrapper component that mounts the rest
 *     of the provider tree (`I18nProvider`, `ThemeProvider`, `FlowProvider`,
 *     `UserProvider`) so downstream composables receive real context values.
 *  4. **ThunderIDPlugin (delegated)** — install the Vue SDK plugin in
 *     delegated mode so it skips browser-only initialisation (SSR-safe).
 */
export default defineNuxtPlugin((nuxtApp: NuxtApp) => {
  const publicConfig: {
    afterSignInUrl: string;
    afterSignOutUrl: string;
    applicationId?: string;
    baseUrl: string;
    clientId: string;
    organizationHandle?: string;
    scopes: string | string[];
    signInUrl?: string;
    signUpUrl?: string;
    vendor?: string;
  } = useRuntimeConfig().public.thunderid as {
    afterSignInUrl: string;
    afterSignOutUrl: string;
    applicationId?: string;
    baseUrl: string;
    clientId: string;
    organizationHandle?: string;
    scopes: string | string[];
    signInUrl?: string;
    signUpUrl?: string;
    vendor?: string;
  };

  const vendor: string = getVendorPrefix(publicConfig.vendor);

  // Surface misconfiguration in the browser dev console only. The server
  // counterpart is handled by the thunderid-ssr Nitro plugin; doing both
  // covers the two places a developer will actually look.
  if (import.meta.client && import.meta.dev) {
    if (!publicConfig?.baseUrl || !publicConfig?.clientId) {
      // eslint-disable-next-line no-console
      console.warn(
        '[@thunderid/nuxt] Missing baseUrl or clientId. ' +
          'Set NUXT_PUBLIC_THUNDERID_BASE_URL and NUXT_PUBLIC_THUNDERID_CLIENT_ID, ' +
          'or configure `thunderid` in nuxt.config. Auth endpoints will not function until this is resolved.',
      );
    }
  }

  // ── 1. Hydrate auth state family ────────────────────────────────────────
  //  Each key is written on the server inside `if (import.meta.server)` so
  //  Nuxt snapshots the values into the `__NUXT__` payload and the client
  //  hydrates automatically — no extra fetch needed.

  const authState: Ref<ThunderIDAuthState> = useState<ThunderIDAuthState>(getAuthStateKey(vendor), () => ({
    isLoading: true,
    isSignedIn: false,
    user: null,
  }));
  const userProfileState: Ref<UserProfile | null> = useState<UserProfile | null>(
    getUserProfileStateKey(vendor),
    () => null,
  );
  const userSchemaState: Ref<Record<string, AttributeSchema> | null> = useState<Record<string, AttributeSchema> | null>(
    getUserSchemaStateKey(vendor),
    () => null,
  );

  if (import.meta.server) {
    const event: H3Event | undefined = useRequestEvent();
    const ssr: ThunderIDSSRData | undefined = (event?.context as Record<string, any> | undefined)?.[vendor]?.ssr;

    if (ssr) {
      // Seed from the rich SSR payload written by the thunderid-ssr Nitro plugin.
      authState.value = {
        isLoading: false,
        isSignedIn: ssr.isSignedIn,
        user: ssr.user,
      };
      userProfileState.value = ssr.userProfile;
      userSchemaState.value = ssr.userSchema ?? null;
    } else {
      // Backwards-compat: fall back to the legacy context shape (pre-Step-2 plugin).
      const ssrContext: {isSignedIn?: boolean; session?: {sub?: string}} | undefined = (
        event?.context as Record<string, any> | undefined
      )?.[vendor] as {isSignedIn?: boolean; session?: {sub?: string}} | undefined;
      if (ssrContext) {
        authState.value = {
          isLoading: false,
          isSignedIn: ssrContext.isSignedIn ?? false,
          user: ssrContext.session?.sub ? ({sub: ssrContext.session.sub} as ThunderIDAuthState['user']) : null,
        };
      } else {
        const legacyAuth: ThunderIDAuthState | undefined = event?.context?.__thunderidAuth as
          | ThunderIDAuthState
          | undefined;
        authState.value = legacyAuth ?? {isLoading: false, isSignedIn: false, user: null};
      }
    }
  }

  if (import.meta.client) {
    authState.value = {...authState.value, isLoading: false};
  }

  // ── 2. Reactive refs over auth state ────────────────────────────────────
  const isSignedIn: ComputedRef<boolean> = computed(() => authState.value.isSignedIn);
  const isLoading: ComputedRef<boolean> = computed(() => authState.value.isLoading);
  const isInitialized: ComputedRef<boolean> = computed(() => !authState.value.isLoading);
  // `user` is backed by the dedicated state key so ThunderIDRoot can read it
  // reactively without going through the THUNDERID_KEY indirection.
  const user: ComputedRef<ThunderIDAuthState['user'] | null> = computed(() => authState.value.user ?? null);

  // ── 3. Action helpers (Nuxt-aware navigation) ───────────────────────────
  const signIn = async (options?: Record<string, unknown>): Promise<void> => {
    const returnTo: string | undefined = typeof options?.returnTo === 'string' ? options.returnTo : undefined;
    const url: string = returnTo ? `/api/auth/signin?returnTo=${encodeURIComponent(returnTo)}` : '/api/auth/signin';
    await navigateTo(url, {external: true});
  };

  const signOut = async (): Promise<void> => {
    const res: {redirectUrl: string} = await $fetch<{redirectUrl: string}>('/api/auth/signout', {method: 'POST'});
    await navigateTo(res.redirectUrl || '/', {external: true});
  };

  // Redirect-based sign-up — mirrors `ThunderIDReactClient.signUp` (no-arg
  // overload). The composable's `signUp` shadows this for SDK consumers, but
  // base components in `@thunderid/vue` (e.g. `BaseSignUpButton`) call into
  // the context's `signUp` directly when no Nuxt-aware override is in scope.
  const signUp = async (): Promise<void> => {
    if (publicConfig.signUpUrl) {
      await navigateTo(publicConfig.signUpUrl, {external: true});
      return;
    }

    const redirectUrl: string = getRedirectBasedSignUpUrl({
      applicationId: publicConfig.applicationId,
      baseUrl: publicConfig.baseUrl,
      clientId: publicConfig.clientId,
    } as any);

    if (redirectUrl) {
      await navigateTo(redirectUrl, {external: true});
      return;
    }

    // Last-resort fallback for unrecognised baseUrls — keeps the historical
    // behaviour of hitting the (POST-only) Nitro route, which will surface a
    // 405 in the network tab and make the misconfiguration obvious.
    await navigateTo('/api/auth/signup', {external: true});
  };

  const getAccessToken = async (): Promise<string> => {
    try {
      const res: {accessToken: string} = await $fetch<{accessToken: string}>('/api/auth/token');
      return res.accessToken ?? '';
    } catch {
      return '';
    }
  };

  const noop = async (): Promise<any> => undefined;

  // ── 4. Provide THUNDERID_KEY at the app level ────────────────────────────
  nuxtApp.vueApp.provide(THUNDERID_KEY, {
    afterSignInUrl: publicConfig.afterSignInUrl,
    applicationId: publicConfig.applicationId,
    baseUrl: publicConfig.baseUrl,
    clearSession: noop,
    clientId: publicConfig.clientId,
    exchangeToken: noop,
    getAccessToken,
    getDecodedIdToken: noop,
    getIdToken: noop,
    http: {request: noop, requestAll: noop},
    instanceId: 0,
    isInitialized,
    isLoading,
    isSignedIn,
    organizationHandle: publicConfig.organizationHandle,
    platform: undefined,
    reInitialize: async () => false,
    scopes: publicConfig.scopes,
    signIn,
    signInOptions: undefined,
    signInSilently: noop,
    signInUrl: publicConfig.signInUrl,
    signOut,
    signUp,
    signUpUrl: publicConfig.signUpUrl,
    storage: undefined,
    user,
  });

  // ── 5. Register ThunderIDRoot + install Vue plugin in delegated mode ─────
  nuxtApp.vueApp.component('ThunderIDRoot', ThunderIDRoot);
  nuxtApp.vueApp.use(ThunderIDPlugin, {mode: 'delegated'});
});
