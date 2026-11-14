// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  getRedirectBasedSignUpUrl,
  getTokenPermissions,
  OrganizationUnitSwitchErrorCodes,
  ThunderIDAPIError,
} from '@thunderid/browser';
import {VendorConstants} from '@thunderid/node';
import type {
  AttributeSchema,
  CurrentOrganizationUnit,
  FlowMetadataResponse,
  SwitchOrganizationUnitOptions,
  User,
  UserProfile,
} from '@thunderid/node';
import {ThunderIDPlugin, THUNDERID_KEY, useCurrentProjectState} from '@thunderid/vue';
import type {CurrentProjectState} from '@thunderid/vue';
import type {H3Event} from 'h3';
import {computed} from 'vue';
import type {ComputedRef, Ref} from 'vue';
import ThunderIDRoot from '../components/ThunderIDRoot';
import NuxtAPIRoutes from '../constants/NuxtAPIRoutes';
import type {ThunderIDAuthState, ThunderIDNuxtConfig, ThunderIDSSRData} from '../types';
import fetchManagementFromServer from '../utils/fetchManagementFromServer';
import switchOrganizationUnitOnServer from '../utils/switchOrganizationUnitOnServer';
import {getAuthStateKey, getFlowMetaStateKey, getUserProfileStateKey, getUserSchemaStateKey} from '../utils/stateKeys';
import type {NuxtApp} from '#app';
import {defineNuxtPlugin, useState, useRequestEvent, useRuntimeConfig, navigateTo, refreshNuxtData} from '#app';

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
    endpoints?: ThunderIDNuxtConfig['endpoints'];
    management?: boolean;
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
    endpoints?: ThunderIDNuxtConfig['endpoints'];
    management?: boolean;
    organizationHandle?: string;
    scopes: string | string[];
    signInUrl?: string;
    signUpUrl?: string;
    vendor?: string;
  };

  const vendor: string = publicConfig.vendor ?? VendorConstants.VENDOR_PREFIX;

  // Surface misconfiguration in the browser dev console only. The server
  // counterpart is handled by the thunderid-ssr Nitro plugin; doing both
  // covers the two places a developer will actually look.
  if (import.meta.client && import.meta.dev) {
    if (!publicConfig?.baseUrl || (!publicConfig?.clientId && !publicConfig?.applicationId)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[@thunderid/nuxt] Missing baseUrl, or both clientId and applicationId. ' +
          'Set NUXT_PUBLIC_THUNDERID_BASE_URL and either NUXT_PUBLIC_THUNDERID_CLIENT_ID (redirect flow) ' +
          'or NUXT_PUBLIC_THUNDERID_APPLICATION_ID (native flow), or configure `thunderid` in nuxt.config. ' +
          'Auth endpoints will not function until this is resolved.',
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
  // Seeded from `event.context[vendor].flowMeta` (written unconditionally by the thunderid-ssr
  // Nitro plugin, regardless of sign-in state) so `FlowMetaProvider` can skip its own initial
  // client-side fetch — see `runtime/components/ThunderIDRoot.ts`.
  const flowMetaState: Ref<FlowMetadataResponse | null> = useState<FlowMetadataResponse | null>(
    getFlowMetaStateKey(vendor),
    () => null,
  );

  if (import.meta.server) {
    const event: H3Event | undefined = useRequestEvent();
    const eventVendorContext: Record<string, any> | undefined = (event?.context as Record<string, any> | undefined)?.[
      vendor
    ];
    const ssr: ThunderIDSSRData | undefined = eventVendorContext?.ssr;

    flowMetaState.value = (eventVendorContext?.flowMeta as FlowMetadataResponse | undefined) ?? null;

    if (ssr) {
      // Seed from the rich SSR payload written by the thunderid-ssr Nitro plugin.
      authState.value = {
        isLoading: false,
        isSignedIn: ssr.isSignedIn,
        organizationId: ssr.session?.organizationId,
        organizationUnit: ssr.organizationUnit ?? null,
        scopes: ssr.session?.scopes,
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
    const url: string = returnTo
      ? `${NuxtAPIRoutes.SIGN_IN}?returnTo=${encodeURIComponent(returnTo)}`
      : NuxtAPIRoutes.SIGN_IN;
    await navigateTo(url, {external: true});
  };

  const currentOrganizationUnit: ComputedRef<CurrentOrganizationUnit | null> = computed(
    () => authState.value.organizationUnit ?? null,
  );

  // Switching first exchanges the session's device secret on the server, which replaces the session
  // without leaving the page. Without one, or when the server needs the user, it signs in again through
  // the sign-in route, bounded to the unit: the server reuses the SSO session, so normally no credentials
  // are asked, and the callback replaces the session only on success.
  const switchOrganizationUnit = async (
    organizationUnitId: string,
    options?: SwitchOrganizationUnitOptions,
  ): Promise<User | undefined> => {
    const switched: ThunderIDAuthState | undefined = await switchOrganizationUnitOnServer(organizationUnitId);

    if (switched) {
      authState.value = switched;
      await refreshNuxtData();

      return switched.user ?? undefined;
    }

    if (options?.redirect === false) {
      throw new ThunderIDAPIError(
        JSON.stringify({
          code: 'interaction_required',
          message: {defaultValue: 'interaction_required'},
        }),
        OrganizationUnitSwitchErrorCodes.InteractionRequired,
        'nuxt',
      );
    }

    const {returnTo: requestedReturnTo} = options ?? {};
    const returnTo: string | undefined =
      typeof requestedReturnTo === 'string'
        ? requestedReturnTo
        : import.meta.client
          ? `${window.location.pathname}${window.location.search}`
          : undefined;
    const params: URLSearchParams = new URLSearchParams({ouId: organizationUnitId});

    if (returnTo) {
      params.set('returnTo', returnTo);
    }

    await navigateTo(`${NuxtAPIRoutes.SIGN_IN}?${params.toString()}`, {external: true});

    return undefined;
  };

  const signOut = async (): Promise<void> => {
    const res: {redirectUrl: string} = await $fetch<{redirectUrl: string}>(NuxtAPIRoutes.SIGN_OUT, {method: 'POST'});
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
    await navigateTo(NuxtAPIRoutes.SIGN_UP, {external: true});
  };

  const getAccessToken = async (): Promise<string> => {
    try {
      const res: {accessToken: string} = await $fetch<{accessToken: string}>(NuxtAPIRoutes.TOKEN);
      return res.accessToken ?? '';
    } catch {
      return '';
    }
  };

  const getGrantedPermissions = async (): Promise<string[]> => getTokenPermissions(await getAccessToken());

  const noop = async (): Promise<any> => undefined;

  // The current project is a client-side preference for the management UI. It is restored once the app
  // is mounted, so the server-rendered page and the first client render agree.
  const projectState: CurrentProjectState = useCurrentProjectState(vendor);

  if (import.meta.client) {
    nuxtApp.hook('app:mounted', (): void => projectState.restore());
  }

  // ── 4. Provide THUNDERID_KEY at the app level ────────────────────────────
  nuxtApp.vueApp.provide(THUNDERID_KEY, {
    afterSignInUrl: publicConfig.afterSignInUrl,
    applicationId: publicConfig.applicationId,
    baseUrl: publicConfig.baseUrl,
    clearSession: noop,
    clientId: publicConfig.clientId,
    currentOrganizationUnit,
    currentProject: projectState.currentProject,
    setCurrentProject: projectState.setCurrentProject,
    getCurrentOrganizationUnit: (): Promise<CurrentOrganizationUnit | null> =>
      Promise.resolve(currentOrganizationUnit.value),
    switchOrganizationUnit,
    // Lets the management composables build the URLs the management route accepts.
    endpoints: publicConfig.endpoints,
    exchangeToken: noop,
    getAccessToken,
    getGrantedPermissions,
    getDecodedIdToken: noop,
    getIdToken: noop,
    http: {
      // With `management` on, the management composables reach the management API through a server
      // route that adds the server-held access token.
      ...(publicConfig.management ? {fetcher: fetchManagementFromServer} : {}),
      request: noop,
      requestAll: noop,
    },
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
