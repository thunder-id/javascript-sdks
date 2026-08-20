// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig, useState} from '#app';
import type {Ref} from 'vue';
import type {RouteLocationNormalized} from 'vue-router';
import NuxtAPIRoutes from '../constants/NuxtAPIRoutes';
import type {ThunderIDAuthState} from '../types';
import {getAuthStateKey} from '../utils/stateKeys';

export interface ThunderIDMiddlewareOptions {
  /**
   * The path to redirect unauthenticated (or unauthorised) requests to.
   * Defaults to `NuxtAPIRoutes.SIGN_IN`.
   */
  redirectTo?: string;
  /**
   * If `true`, the middleware will also require that the user has an
   * `organizationId` in their session.  Redirects to `redirectTo` if not.
   */
  requireOrganization?: boolean;
  /**
   * Required OAuth scopes.  The middleware checks that every listed scope
   * is present in the session before allowing access.
   */
  requireScopes?: string[];
}

const DEFAULT_REDIRECT_TO = NuxtAPIRoutes.SIGN_IN;

/**
 * Typed factory for ThunderID route middleware.
 *
 * Usage in a page component:
 * ```vue
 * <script setup>
 * definePageMeta({
 *   middleware: [defineThunderIDMiddleware({ requireOrganization: true })]
 * });
 * </script>
 * ```
 *
 * Or add it as a named middleware in `middleware/` and reference by name.
 *
 * The built-in `'auth'` middleware registered by this module is equivalent
 * to calling `defineThunderIDMiddleware()` with no options.
 */
export function defineThunderIDMiddleware(
  options: ThunderIDMiddlewareOptions = {},
): ReturnType<typeof defineNuxtRouteMiddleware> {
  const {redirectTo = DEFAULT_REDIRECT_TO, requireOrganization = false, requireScopes = []} = options;

  return defineNuxtRouteMiddleware((to: RouteLocationNormalized) => {
    // Must resolve the same `vendor` as `runtime/plugins/thunderid.ts` and
    // `runtime/components/ThunderIDRoot.ts` so all three read/write the same
    // `useState` key.
    const vendor: string | undefined = (useRuntimeConfig().public.thunderid as {vendor?: string} | undefined)?.vendor;
    const authState: Ref<ThunderIDAuthState> = useState<ThunderIDAuthState>(getAuthStateKey(vendor));

    if (!authState.value?.isSignedIn) {
      const returnTo: string = encodeURIComponent(to.fullPath);
      return navigateTo(`${redirectTo}?returnTo=${returnTo}`, {external: true});
    }

    const user: Record<string, unknown> | null = authState.value.user as Record<string, unknown> | null;

    if (requireOrganization && !user?.organizationId) {
      return navigateTo(redirectTo, {external: true});
    }

    if (requireScopes.length > 0) {
      const sessionScopes: string[] = String(user?.scopes ?? '').split(' ');
      const hasAllScopes: boolean = requireScopes.every((s: string) => sessionScopes.includes(s));
      if (!hasAllScopes) {
        return navigateTo(redirectTo, {external: true});
      }
    }

    return undefined;
  });
}
