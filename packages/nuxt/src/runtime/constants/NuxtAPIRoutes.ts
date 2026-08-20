// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Nitro API route paths registered by the ThunderID Nuxt SDK.
 *
 * Single source of truth for the `/api/auth/*` paths registered as server
 * handlers in `module.ts` and consumed across `runtime/composables/useThunderID.ts`,
 * `runtime/components/ThunderIDRoot.ts`, `runtime/plugins/thunderid.ts`,
 * `runtime/middleware/defineThunderIDMiddleware.ts`, and
 * `runtime/server/plugins/thunderid-ssr.ts`. Update a route here, not at each
 * call site.
 *
 * @example
 * ```typescript
 * await $fetch(NuxtAPIRoutes.SIGN_IN, { method: 'POST' });
 * ```
 */
const NuxtAPIRoutes: {
  CALLBACK: string;
  META: string;
  SESSION: string;
  SIGN_IN: string;
  SIGN_OUT: string;
  SIGN_UP: string;
  TOKEN: string;
  USER: string;
  USER_PROFILE: string;
} = {
  /** Resolves the OAuth callback and completes sign-in. */
  CALLBACK: '/api/auth/callback',
  /** Serves flow metadata (design config + i18n bundle). */
  META: '/api/auth/meta',
  /** Returns the current server-verified session. */
  SESSION: '/api/auth/session',
  /** Starts (embedded) or redirects to (redirect flow) sign-in. */
  SIGN_IN: '/api/auth/signin',
  /** Clears the session and returns a post-sign-out redirect URL. */
  SIGN_OUT: '/api/auth/signout',
  /** Starts (embedded) or redirects to (redirect flow) sign-up. */
  SIGN_UP: '/api/auth/signup',
  /** Returns the current access token. */
  TOKEN: '/api/auth/token',
  /** Returns the current user object. */
  USER: '/api/auth/user',
  /** Fetches (GET) and updates (PATCH) the user profile. */
  USER_PROFILE: '/api/auth/user/profile',
} as const;

export default NuxtAPIRoutes;
