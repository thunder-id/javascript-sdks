// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {
  AttributeSchema,
  AuthClientConfig,
  FlowMetadataResponse,
  I18nPreferences,
  PagedSelectErrorResult,
  PagedSelectPage,
  TokenEndpointAuthMethod,
  User,
  UserProfile,
} from '@thunderid/node';
import type {JWTPayload} from 'jose';

/**
 * Configuration for the ThunderID Nuxt module.
 * Extends `AuthClientConfig` from `@thunderid/node` for 1:1 SDK parity.
 */
export interface ThunderIDNuxtConfig extends AuthClientConfig {
  /**
   * OpenID Connect back-channel logout. When enabled, the module serves
   * `POST /api/auth/backchannel-logout` (or `path`), which ThunderID calls when a session this
   * application took part in ends. Register that URL as the application's back-channel logout URI.
   */
  backchannelLogout?: {
    enabled?: boolean;
    /** Route of the handler. Defaults to `/api/auth/backchannel-logout`. */
    path?: string;
    /**
     * Name of a Nitro storage mount point that records ended sessions. Needed when more than one
     * instance of the application runs. Defaults to the memory of this process.
     */
    store?: string;
  };
  /** Secret for signing session JWTs (use THUNDERID_SESSION_SECRET env var) */
  sessionSecret?: string;
  /**
   * Flow Secret for this app. Sent in the `Flow-Secret` request header to authenticate the app
   * when an embedded (app-native) flow starts (use THUNDERID_FLOW_SECRET env var). Server-only,
   * never exposed to the browser.
   */
  flowSecret?: string;
  /** Platform identifier */
  platform?: any;
  /**
   * Vendor/brand namespace used to prefix Nuxt `useState` keys, the
   * `event.context` namespace, and other server-side identifiers.
   * Override this when white-labeling the SDK under a different brand.
   *
   * Note: this is unrelated to the module's Nuxt config key (`thunderid: {...}`
   * in `nuxt.config.ts`), which is fixed and not affected by this option.
   *
   * @default 'thunderid'
   */
  vendor?: string;
}

/**
 * Payload stored in the session JWT cookie.
 */
export interface ThunderIDSessionPayload extends JWTPayload {
  accessToken: string;
  /** Unix timestamp (seconds) when the access token expires. Used for proactive refresh. */
  accessTokenExpiresAt?: number;
  exp: number;
  iat: number;
  /** Raw ID token string (for userinfo derivation without in-memory store). */
  idToken?: string;
  organizationId?: string;
  /** Refresh token for obtaining new access tokens without re-authentication. */
  refreshToken?: string;
  scopes: string;
  sessionId: string;
  /** The server session this session joined, from the `sid` of the ID token. */
  sid?: string;
  /** Unix timestamp (seconds) of the sign-in. Kept when the cookie is re-issued on token refresh. */
  signedInAt?: number;
  sub: string;
}

/**
 * Payload stored in the temporary session JWT cookie (during OAuth flow).
 */
export interface ThunderIDTempSessionPayload extends JWTPayload {
  /** URL to redirect to after successful sign-in */
  returnTo?: string;
  sessionId: string;
  type: 'temp';
}

/**
 * Full SSR payload resolved by the Nitro plugin on each page request.
 * Written to `event.context[vendor].ssr` (default vendor: `'thunderid'`, i.e.
 * `event.context.thunderid.ssr`) and subsequently seeded into hydrated
 * `useState` keys so the client never re-fetches on first render.
 */
export interface ThunderIDSSRData {
  isSignedIn: boolean;
  /**
   * The base URL actually used for this request.
   * Equals `${baseUrl}/o` when the user is acting within an organisation
   * (derived from the `user_org` claim in the ID token), otherwise equals
   * the configured `baseUrl`.
   */
  resolvedBaseUrl: string | null;
  session: ThunderIDSessionPayload | null;
  user: User | null;
  /** Flattened user profile + raw profile (null when `preferences.user.fetchUserProfile` is false). */
  userProfile: UserProfile | null;
  /** User schema metadata from /users/me/meta (null when `preferences.user.fetchUserProfile` is false). */
  userSchema?: Record<string, AttributeSchema> | null;
}

/**
 * Auth state hydrated from server to client via useState.
 */
export interface ThunderIDAuthState {
  isLoading: boolean;
  isSignedIn: boolean;
  user: User | null;
}

/**
 * Result of `GET /api/auth/users`: one normalized `USER_SELECT` page, or why it could not be loaded.
 */
export type ThunderIDGetUsersResult =
  | {page: PagedSelectPage; success: true}
  | ({success: false} & PagedSelectErrorResult);
