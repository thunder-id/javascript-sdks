// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BackendEndpoints, ResolvedBackendEndpoints} from '../models/backend';

const DEFAULT_BACKEND_BASE_PATH = '/api/auth';

/**
 * Minimal shape of the config needed to resolve the backend endpoints.
 */
export interface BackendEndpointConfig {
  baseUrl?: string;
  endpoints?: {backend?: BackendEndpoints};
}

/**
 * Resolves the backend endpoints from `endpoints.backend`, or returns `undefined` when it is not set
 * and sign-in does not run on a backend.
 *
 * @param config - The client config.
 * @param origin - The app's origin, used as the API base when `baseUrl` is not set.
 * @returns The resolved endpoints, or `undefined` when `endpoints.backend` is not set.
 *
 * @example
 * ```typescript
 * resolveBackendEndpoints({endpoints: {backend: {signIn: '/auth/signin'}}}, window.location.origin);
 * // {signIn: '/auth/signin', session: '/api/auth/session', ..., apiBaseUrl: 'https://...'}
 * ```
 */
const resolveBackendEndpoints = (
  config: BackendEndpointConfig | undefined,
  origin: string,
): ResolvedBackendEndpoints | undefined => {
  const endpoints: BackendEndpoints | undefined = config?.endpoints?.backend;

  if (!endpoints) {
    return undefined;
  }

  return {
    // `||`, not `??`: an empty baseUrl, which the providers default to, falls back to the origin too.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    apiBaseUrl: (config?.baseUrl || origin).replace(/\/+$/, ''),
    bypass: {
      attachToken: endpoints.bypass?.attachToken ?? true,
      urls: (endpoints.bypass?.urls ?? []).map((url: string) => url.replace(/\/+$/, '')),
    },
    checkSession: endpoints.checkSession ?? `${DEFAULT_BACKEND_BASE_PATH}/checksession`,
    proxy: (endpoints.proxy ?? `${DEFAULT_BACKEND_BASE_PATH}/proxy`).replace(/\/+$/, ''),
    refresh: endpoints.refresh ?? `${DEFAULT_BACKEND_BASE_PATH}/refresh`,
    session: endpoints.session ?? `${DEFAULT_BACKEND_BASE_PATH}/session`,
    signIn: endpoints.signIn ?? `${DEFAULT_BACKEND_BASE_PATH}/signin`,
    signOut: endpoints.signOut ?? `${DEFAULT_BACKEND_BASE_PATH}/signout`,
    token: endpoints.token ?? `${DEFAULT_BACKEND_BASE_PATH}/token`,
  };
};

export default resolveBackendEndpoints;
