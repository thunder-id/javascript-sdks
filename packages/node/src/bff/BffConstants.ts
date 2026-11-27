// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The fixed parts of the BFF contract: endpoint names, the request header, and error codes. The
 * prefix the endpoints are served under can change; their names cannot.
 */
const BffConstants = {
  /** The prefix the endpoints are served under, unless configured. */
  DEFAULT_PREFIX: '/api/auth',

  Endpoints: {
    BACKCHANNEL_LOGOUT: '/backchannel-logout',
    CALLBACK: '/callback',
    CHECK_SESSION: '/checksession',
    PROXY: '/proxy',
    REFRESH: '/refresh',
    SESSION: '/session',
    SIGN_IN: '/signin',
    SIGN_OUT: '/signout',
    SWITCH: '/switch',
    TOKEN: '/token',
  },

  /**
   * Error codes in the `error` field of a JSON error body. `login_required` tells the browser the
   * session is over.
   */
  Errors: {
    BAD_GATEWAY: 'bad_gateway',
    FORBIDDEN: 'forbidden',
    INVALID_PATH: 'invalid_path',
    INVALID_REQUEST: 'invalid_request',
    LOGIN_REQUIRED: 'login_required',
    METHOD_NOT_ALLOWED: 'method_not_allowed',
    NOT_FOUND: 'not_found',
    SERVER_ERROR: 'server_error',
  },

  /**
   * The header every call from the browser SDK carries. A page on another origin cannot add it
   * without a CORS preflight, which the BFF never answers, so a cross-site request cannot use the
   * session cookie.
   */
  REQUEST_HEADER: 'x-requested-with',
  REQUEST_HEADER_VALUE: 'XMLHttpRequest',

  /**
   * ID token claims that only matter for validating the token, so the session's `user` leaves them
   * out. `auth_time`, `iat` and `exp` stay: apps show when the user signed in.
   */
  PROTOCOL_CLAIMS: ['acr', 'amr', 'at_hash', 'aud', 'azp', 'c_hash', 'iss', 'jti', 'nbf', 'nonce', 'sid'],

  /**
   * API paths the proxy forwards without a session, a token or the request header. The browser SDK
   * reads the sign-in UI's translations and branding from `/flow/meta` before anyone signs in, with a
   * plain `fetch`. It is public and read only.
   */
  PUBLIC_PROXY_PATHS: ['/flow/meta'],

  /** Request headers the proxy passes on. Cookies and the request header stay at the BFF. */
  PROXY_REQUEST_HEADERS: ['accept', 'accept-language', 'content-type', 'if-match', 'if-none-match'],

  /** Response headers the proxy passes back. */
  PROXY_RESPONSE_HEADERS: ['content-type', 'etag', 'last-modified', 'location', 'www-authenticate'],
} as const;

export default BffConstants;
