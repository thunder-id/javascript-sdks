// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Options for signing the signed-in user in again.
 */
export interface ReauthenticationOptions {
  /**
   * How recent, in seconds, the sign-in must be, sent as `max_age` (RFC 9470). Take it from a
   * `StepUpRequiredError`. Without it, the request asks for `prompt=login`.
   */
  maxAge?: number;
}

/**
 * How the signed-in user signs in again for a change that needs a recent sign-in:
 *
 * - `popup`: an authorization request in a popup, for a session from a redirect sign-in.
 * - `flow`: the sign-in flow run again in the app, for a session from an embedded sign-in flow.
 * - `unavailable`: the session is held by a backend, which signs the user in again itself.
 */
export type ReauthenticationMethod = 'popup' | 'flow' | 'unavailable';

/**
 * An authorization request that signs the signed-in user in again, and what redeeming its code needs.
 */
export interface ReauthenticationRequest {
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
  resource?: string;
  state: string;
  url: string;
}
