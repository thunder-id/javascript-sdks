// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BackchannelLogoutResult, ThunderIDNodeConfig, ThunderIDRuntimeError, TokenResponse} from '@thunderid/node';
import express from 'express';

/**
 * Express-specific configuration fields.
 */
export interface StrictExpressClientConfig {
  /** Called with the response and token on successful sign-in. */
  onSignIn?: (res: express.Response, tokenResponse: TokenResponse) => void;
  /** Called with the response on successful sign-out. */
  onSignOut?: (res: express.Response) => void;
  /** Called with the response and error on authentication failure. */
  onError?: (res: express.Response, exception: ThunderIDRuntimeError) => void;
  /** Called with the response when a protected route is accessed without a valid session. */
  onUnauthenticated?: (res: express.Response) => void;
  /**
   * Called after a back-channel logout ended this SDK's sessions, so the application can clear
   * what it holds for them. Best effort: a failure is logged and the handler still answers 200,
   * since the sessions are already ended and a retry would find nothing.
   *
   * This SDK mounts the endpoint with `handleBackchannelLogout()` and does not read the
   * `backchannelLogout` configuration key of the SDK specification.
   */
  onBackchannelLogout?: (result: BackchannelLogoutResult) => void | Promise<void>;
}

/**
 * Full configuration type for `ThunderIDExpressClient`.
 * Combines node-level auth config with Express-specific settings.
 *
 * `afterSignInUrl` and `afterSignOutUrl` are optional. When omitted, the SDK
 * infers them from the first incoming request's origin combined with the path
 * derived from those URLs (defaulting to `/login` and `/logout`).
 *
 * Set `mode: 'embedded'` to enable app-native embedded auth via `handleFlow()`.
 * Defaults to `'redirect'` (standard OAuth 2.0 authorization-code flow).
 *
 * Inherits `vendor` and `sessionCookie.name` from `ThunderIDNodeConfig` — set
 * either to control the session cookie name written by this SDK (default:
 * `thunderid-session`, the same `@thunderid/node` `CookieConfig` naming
 * convention used by every server-side ThunderID SDK, derived from `vendor`
 * defaulting to `'thunderid'`). `sessionCookie.name` takes priority over the
 * `vendor`-derived default.
 */
export type ExpressClientConfig = ThunderIDNodeConfig & StrictExpressClientConfig;

/**
 * Configuration type for the ThunderID Express.js SDK.
 */
export type ThunderIDExpressConfig = ExpressClientConfig;
