// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import resolveBackendEndpoints, {type BackendEndpointConfig} from './resolveBackendEndpoints';

/**
 * Resolves the base URL the SDK builds its own API requests on, such as `/users/me` and the
 * management APIs.
 *
 * When sign-in runs on a backend (`endpoints.backend`), that's the backend's proxy, resolved against
 * `baseUrl` (the backend): the backend maps it to the API from its own configuration, so the app never
 * needs the API's address. Otherwise it's `baseUrl`.
 *
 * @param config - The client config.
 * @returns The base URL, or `undefined` when none is configured.
 *
 * @example
 * ```typescript
 * resolveRequestBaseUrl({baseUrl: 'https://bff.example.com', endpoints: {backend: {proxy: '/api'}}});
 * // 'https://bff.example.com/api'
 * ```
 */
const resolveRequestBaseUrl = (config: BackendEndpointConfig | undefined): string | undefined => {
  if (config?.endpoints?.backend) {
    return resolveBackendEndpoints(config, '')?.proxy;
  }

  return config?.baseUrl;
};

export default resolveRequestBaseUrl;
