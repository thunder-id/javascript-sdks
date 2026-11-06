// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Options for starting a device authorization request (RFC 8628 §3.1).
 */
export interface DeviceAuthorizationOptions {
  /**
   * A single resource indicator (RFC 8707) the token is requested for.
   */
  resource?: string;
  /**
   * Scopes to request. Defaults to the configured `scopes`.
   */
  scopes?: string | string[];
}

/**
 * The device authorization response (RFC 8628 §3.2).
 *
 * `deviceCode` is a credential: pass it to `pollDeviceAuthorization` only, and never show or log it.
 * Show the user `userCode` and `verificationUri` (or `verificationUriComplete`, for example as a QR
 * code).
 */
export interface DeviceAuthorizationResponse {
  /**
   * The device verification code. A credential: never show or log it.
   */
  deviceCode: string;
  /**
   * Lifetime of the codes in seconds.
   */
  expiresIn: number;
  /**
   * Minimum number of seconds to wait between polls.
   */
  interval: number;
  /**
   * The code the user enters at the verification URI.
   */
  userCode: string;
  /**
   * Where the user enters the code.
   */
  verificationUri: string;
  /**
   * The verification URI with the user code included.
   */
  verificationUriComplete?: string;
}

/**
 * Options for `pollDeviceAuthorization`.
 */
export interface DeviceAuthorizationPollOptions {
  /**
   * Cancels polling. An abort rejects with `JS-AUTH_CORE-DEVICE2-AB05`.
   */
  signal?: AbortSignal;
}
