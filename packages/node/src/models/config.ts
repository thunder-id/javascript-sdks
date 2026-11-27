// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Config} from '@thunderid/javascript';

/**
 * Session cookie configuration options shared across all server-side SDKs.
 *
 * All fields are optional; unset fields fall back to the defaults defined in
 * each framework SDK's `CookieConfig` constants.
 */
export interface SessionCookieConfig {
  /**
   * Session lifetime in seconds. Controls both the server-side session validation
   * window and the browser cookie max-age (multiplied by 1000 for ms).
   *
   * Resolution order (first defined value wins):
   *   1. This field — set programmatically at SDK initialisation.
   *   2. `THUNDERID_SESSION_COOKIE_EXPIRY_TIME` environment variable.
   *   3. Built-in default of 86400 seconds (24 hours).
   *
   * @example
   * // 8-hour session
   * { sessionCookie: { expiryTime: 28800 } }
   */
  expiryTime?: number;
  /** Whether the cookie is inaccessible to JavaScript. Default: `true`. */
  httpOnly?: boolean;
  /**
   * `SameSite` of the session cookie. Default: `'strict'`, as RFC 10017 recommends for a BFF, or the value of
   * `THUNDERID_SESSION_COOKIE_SAME_SITE`. With `'lax'` the browser also sends the session cookie when the user follows
   * a link from another site, so such a link lands signed in. It then relies on the BFF's request checks alone against
   * cross-site request forgery, and logs a warning. The cookie that carries a sign-in in progress is always `'lax'`.
   */
  sameSite?: 'lax' | 'strict' | 'none';
  /** Whether the cookie requires HTTPS. Default: `true` when `NODE_ENV` is `production`, otherwise `false`. A Secure cookie also gets the `__Host-` prefix, unless `name` is set. */
  secure?: boolean;
  /**
   * Full override of the cookie name. If not set, derived from `vendor`.
   *
   * @example
   * // Use a fully custom cookie name regardless of `vendor`.
   * { sessionCookie: { name: 'my_app_session' } }
   */
  name?: string;
}

/**
 * Configuration type for the ThunderID Node.js SDK.
 * Extends the base Config type from @thunderid/javascript with Node.js specific settings.
 */
export type ThunderIDNodeConfig = Config & {
  /**
   * Access evaluation (AuthZEN) settings, for `evaluateAccess`, `evaluateAccesses` and `searchActions`.
   * The endpoints come from the server's `/.well-known/authzen-configuration` unless overridden here,
   * and an override must be on the origin of `baseUrl`.
   */
  accessEvaluation?: {
    endpoints?: {
      evaluation?: string;
      evaluations?: string;
      searchAction?: string;
    };
    /**
     * The server-level secret sent in the `Direct-Auth-Secret` header. It can also be passed per call.
     * Never logged.
     */
    secret?: string;
  };
  /**
   * Flow Secret used to authenticate this application when it initiates a flow directly via the
   * Flow Execution API. Sent in the `Flow-Secret` request header, and only on flow initiation —
   * continuation requests are authenticated by their `executionId` and challenge token.
   */
  flowSecret?: string;
  /**
   * Session cookie settings. Groups all cookie-related configuration in one place
   * so that any server SDK (Node, Express, Next.js, …) inherits the same shape.
   */
  sessionCookie?: SessionCookieConfig;
  /**
   * Vendor/brand namespace used to prefix cookie names and other server-side identifiers.
   * Override this when white-labeling the SDK under a different brand.
   * @default 'thunderid'
   */
  vendor?: string;
};
