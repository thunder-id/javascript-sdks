// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {navigateTo, useState, useRuntimeConfig} from '#app';
import {EmbeddedSignInFlowStatus, EmbeddedSignUpFlowStatus, getRedirectBasedSignUpUrl} from '@thunderid/browser';
import {useThunderID as useThunderIDVue, type ThunderIDContext} from '@thunderid/vue';
import type {Ref} from 'vue';
import NuxtAPIRoutes from '../constants/NuxtAPIRoutes';
import type {ThunderIDAuthState} from '../types';

/**
 * Nuxt-aware primary composable for ThunderID authentication.
 *
 * Mirrors the Next.js `useThunderID` hook: a thin wrapper over the base SDK's
 * `useThunderID` that re-binds the redirect-based actions (`signIn`, `signOut`,
 * `signUp`) to Nuxt's {@link navigateTo} so SSR redirects use the correct
 * response mechanism instead of `window.location`.
 *
 * The surrounding context is guaranteed to be present by the Nuxt plugin
 * (`THUNDERID_KEY`) and {@link ThunderIDRoot} (the auxiliary provider tree),
 * so this composable does not carry a fallback branch.
 *
 * @example
 * ```vue
 * <script setup>
 * const { isSignedIn, user, signIn, signOut } = useThunderID();
 * </script>
 * ```
 */
export function useThunderID(): ThunderIDContext {
  const context: ThunderIDContext = useThunderIDVue();

  /**
   * Sign in the user.
   *
   * **Embedded flow**: call with `(payload, request)` where `payload` has an
   * `applicationId` (start a new flow) or `executionId` (continue one) property
   * — mirrors `ThunderIDNuxtClient.signIn`'s own payload detection server-side.
   * The method POSTs to `/api/auth/signin` and returns the flow-step response
   * or a synthesized completion response once the server has set the session
   * cookie.
   *
   * **Redirect flow**: call with an optional `options` object (or no args).
   * Navigates to `/api/auth/signin` (which triggers a server redirect to the
   * IdP).
   */
  const signIn = async (...args: any[]): Promise<any> => {
    // Embedded-flow path: arg0 is a non-null object with `applicationId` (new flow)
    // or `executionId` (continuing one).
    const arg0: unknown = args[0];
    const isEmbedded: boolean =
      typeof arg0 === 'object' && arg0 !== null && ('applicationId' in arg0 || 'executionId' in arg0);

    if (isEmbedded) {
      const payload: Record<string, unknown> = arg0 as Record<string, unknown>;
      const request: Record<string, unknown> = (args[1] ?? {}) as Record<string, unknown>;
      const res: {data: any; success: boolean} = await $fetch<{data: any; success: boolean}>(NuxtAPIRoutes.SIGN_IN, {
        body: {payload, request},
        method: 'POST',
      });

      // Flow complete — server has set the session cookie. Refresh the client
      // auth state so `useThunderID().isSignedIn` flips to true *immediately*
      // (without waiting for a full page reload). Then return a synthetic
      // Complete response so the `<SignIn>` container's `handleComplete`
      // emits `success` and drives navigation via `afterSignInUrl`.
      //
      // `authData` is intentionally empty: the auth code / state were already
      // consumed server-side in `signin.post.ts`, so there is nothing to
      // forward to the client. Keeping it `{}` also stops the wrapper's
      // `handleSuccess` from appending stray query params to `afterSignInUrl`.
      if (res.data?.afterSignInUrl) {
        if (import.meta.client) {
          try {
            const session: ThunderIDAuthState = await $fetch<ThunderIDAuthState>(NuxtAPIRoutes.SESSION);
            const authState: Ref<ThunderIDAuthState> = useState<ThunderIDAuthState>('thunderid:auth');
            authState.value = session;
          } catch {
            // Best-effort — the cookie is set; a navigation will recover state.
          }
        }
        return {
          authData: {},
          flowStatus: EmbeddedSignInFlowStatus.Complete,
        };
      }
      return res.data;
    }

    // Redirect flow.
    const options: Record<string, unknown> | undefined = arg0 as Record<string, unknown> | undefined;
    const returnTo: string | undefined = typeof options?.returnTo === 'string' ? options.returnTo : undefined;
    const url: string = returnTo
      ? `${NuxtAPIRoutes.SIGN_IN}?returnTo=${encodeURIComponent(returnTo)}`
      : NuxtAPIRoutes.SIGN_IN;
    await navigateTo(url, {external: true});
    return undefined;
  };

  const signOut = async (): Promise<void> => {
    const res: {redirectUrl: string} = await $fetch<{redirectUrl: string}>(NuxtAPIRoutes.SIGN_OUT, {method: 'POST'});
    await navigateTo(res.redirectUrl || '/', {external: true});
  };

  /**
   * Sign up the user.
   *
   * **Embedded flow**: call with a payload object that has a `flowType` key.
   * POSTs to `/api/auth/signup` and returns the flow-step response or redirects
   * on completion.
   *
   * **Redirect flow** (no args, or anything that doesn't look like a flow
   * payload): navigates to the ThunderID-hosted account-recovery `register.do`
   * page. Mirrors `ThunderIDReactClient.signUp` — when the consumer configures
   * an explicit `signUpUrl`, that wins; otherwise the URL is derived from
   * `baseUrl` / `clientId` / `applicationId` via `getRedirectBasedSignUpUrl`.
   */
  const signUp = async (...args: any[]): Promise<any> => {
    const payload: unknown = args[0];

    // Embedded-flow path: arg0 is a non-null object with a `flowType` key
    // (see `SignUp`'s `handleInitialize`/`handleOnSubmit`).
    const isEmbedded: boolean = typeof payload === 'object' && payload !== null && 'flowType' in payload;

    if (isEmbedded) {
      const res: {data: any; success: boolean} = await $fetch<{data: any; success: boolean}>(NuxtAPIRoutes.SIGN_UP, {
        body: {payload},
        method: 'POST',
      });

      // Flow complete — the server route replies with `{ afterSignUpUrl }`
      // (no `flowStatus`). Synthesize one so `BaseSignUp`'s completion check
      // (`response.flowStatus === Complete`) fires and `<SignUp>`'s
      // `handleComplete` drives the post-registration redirect.
      if (res.data?.afterSignUpUrl) {
        return {afterSignUpUrl: res.data.afterSignUpUrl, flowStatus: EmbeddedSignUpFlowStatus.Complete};
      }

      return res.data;
    }

    // Redirect flow.
    const cfg: {
      applicationId?: string;
      baseUrl?: string;
      clientId?: string;
      signUpUrl?: string;
    } = (useRuntimeConfig().public.thunderid ?? {}) as {
      applicationId?: string;
      baseUrl?: string;
      clientId?: string;
      signUpUrl?: string;
    };

    // Explicit override always wins.
    if (cfg.signUpUrl) {
      await navigateTo(cfg.signUpUrl, {external: true});
      return undefined;
    }

    const redirectUrl: string = getRedirectBasedSignUpUrl({
      applicationId: cfg.applicationId,
      baseUrl: cfg.baseUrl,
      clientId: cfg.clientId,
    } as any);

    if (redirectUrl) {
      await navigateTo(redirectUrl, {external: true});
      return undefined;
    }

    // Last-resort fallback: the embedded sign-up page on the consumer app.
    // Reached only if the baseUrl is unrecognised by getRedirectBasedSignUpUrl
    // (e.g. self-hosted Identity Server with a non-standard host pattern) and
    // no signUpUrl override was configured.
    await navigateTo('/sign-up', {external: false});
    return undefined;
  };

  return {...context, signIn, signOut, signUp} as ThunderIDContext;
}
