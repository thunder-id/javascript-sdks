// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/** Default cookie configuration values. */
const CookieConfig = {
  defaultExpirySeconds: 86400,
  defaultHttpOnly: true,
  defaultSameSite: 'strict' as const,
  /** How long a sign-in may take before the cookie that carries it expires, in seconds. */
  sessionStateMaxAgeSeconds: 900,
  /**
   * @deprecated No longer read. The session cookie is `Secure` by default in production; see
   * `ThunderIDExpressClient.getSessionCookieOptions()`.
   */
  defaultSecure: false,
};

export default CookieConfig;
