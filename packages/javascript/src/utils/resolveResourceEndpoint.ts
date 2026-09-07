// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BaseConfig} from '../models/config';

/**
 * Resource-server endpoints whose URLs can be overridden via `config.endpoints`.
 *
 * Unlike the OIDC/OAuth endpoints, these are not resolved from the well-known discovery document;
 * they are derived by concatenating `baseUrl` with a fixed path. When the authorization server and
 * the Thunder resource server are different hosts (e.g. two Thunder instances connected as trusted
 * issuers), these overrides let the SDK send flow and user-management requests to the resource
 * server while OAuth requests continue to target the authorization server.
 */
export type ResourceEndpointKey = 'flowExecute' | 'flowMeta' | 'usersMe' | 'usersMeCredentials' | 'usersMeMeta';

/**
 * The `config.endpoints` keys that address resource-server endpoints rather than OIDC/OAuth
 * endpoints. Used to keep these overrides out of the resolved OIDC provider metadata.
 */
export const RESOURCE_ENDPOINT_KEYS: readonly ResourceEndpointKey[] = [
  'flowExecute',
  'flowMeta',
  'usersMe',
  'usersMeCredentials',
  'usersMeMeta',
];

/**
 * Minimal shape of the config needed to resolve a resource-server endpoint override.
 * Reuses the `endpoints` type from {@link BaseConfig} so the override shape stays in sync.
 */
export interface ResourceEndpointConfig {
  endpoints?: BaseConfig['endpoints'];
}

/**
 * Resolves the absolute `url` to use for a resource-server endpoint, honoring (in order of
 * precedence) an explicit per-call URL, then a `config.endpoints` override.
 *
 * Returns `undefined` when neither is set, so the calling API function falls back to deriving the
 * endpoint from `baseUrl` (i.e. `${baseUrl}/flow/execute`) exactly as before. Callers should keep
 * passing `baseUrl` alongside the resolved `url` to preserve that fallback.
 *
 * @param key - The resource endpoint to resolve.
 * @param config - The client config carrying optional `endpoints` overrides.
 * @param explicitUrl - An explicit URL provided by the immediate caller; takes highest precedence.
 * @returns The resolved override URL, or `undefined` to defer to `baseUrl`-based resolution.
 *
 * @example
 * ```typescript
 * const response = await executeEmbeddedUserOnboardingFlow({
 *   baseUrl: config.baseUrl,
 *   url: resolveResourceEndpoint('flowExecute', config),
 *   payload,
 * });
 * ```
 */
const resolveResourceEndpoint = (
  key: ResourceEndpointKey,
  config: ResourceEndpointConfig | undefined,
  explicitUrl?: string,
): string | undefined => explicitUrl ?? config?.endpoints?.[key] ?? undefined;

export default resolveResourceEndpoint;
