// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The app backend's auth endpoints, set under `endpoints.backend`. Setting them hands sign-in to the
 * app's backend (the Backend for Frontend pattern): the backend, on the app's own origin, runs the
 * OAuth flow and keeps the tokens. The browser only holds an `HttpOnly` cookie it cannot read, and
 * API calls go through the backend, which attaches the access token.
 *
 * Any endpoint left unset defaults to a fixed path under `/api/auth`.
 *
 * @example
 * endpoints: {backend: {signIn: '/api/auth/signin'}}
 */
export interface BackendEndpoints {
  /** Starts sign-in. Defaults to `/api/auth/signin`. */
  signIn?: string;
  /** Reports the signed-in user. Defaults to `/api/auth/session`. */
  session?: string;
  /**
   * Reports only whether the session is still live, without refreshing it or counting as activity,
   * so the SDK can poll it. Defaults to `/api/auth/checksession`.
   */
  checkSession?: string;
  /** Refreshes the session. Defaults to `/api/auth/refresh`. */
  refresh?: string;
  /** Ends the session. Defaults to `/api/auth/signout`. */
  signOut?: string;
  /**
   * Prefix of the API proxy. Requests under `baseUrl`, or under the app's origin when `baseUrl` is
   * not set, are sent through it. Defaults to `/api/auth/proxy`.
   */
  proxy?: string;
  /**
   * Issues the access token for `bypass`, as an OAuth token response without a refresh token.
   * Defaults to `/api/auth/token`.
   */
  token?: string;
  /** Requests that skip the proxy and go straight from the browser. */
  bypass?: BackendBypass;
}

/**
 * Requests the browser sends directly rather than through the proxy, such as calls to a data plane on
 * another origin. They always carry the cookies.
 *
 * @example
 * bypass: {urls: ['https://dp.example.com/api']}
 */
export interface BackendBypass {
  /** Base URLs whose requests skip the proxy. A request matches its own base URL or anything under it. */
  urls: string[];
  /**
   * Attach the access token from `token` as `Authorization: Bearer`, and get a new one and retry once
   * on a 401. Defaults to `true`. With `false`, requests go out with only the cookies.
   */
  attachToken?: boolean;
}

/**
 * The backend endpoints, fully resolved, with the API base whose requests go through the proxy.
 */
export type ResolvedBackendEndpoints = Required<Omit<BackendEndpoints, 'bypass'>> & {
  apiBaseUrl: string;
  bypass: Required<BackendBypass>;
};

/**
 * What the backend's session endpoint reports.
 */
export interface BackendSession {
  isSignedIn: boolean;
  /** The ID token's user claims, without the protocol claims. */
  user?: Record<string, unknown>;
  /** When the access token expires, in seconds since the epoch. */
  expiresAt?: number;
}
