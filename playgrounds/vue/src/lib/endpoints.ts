// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveResourceEndpoint, ResourceEndpointKey, ThunderIDBrowserConfig} from '@thunderid/browser';

/**
 * `management`: the management collections (users, groups, roles, agents, ...). `selfService`: sign-in,
 * sign-up, flows, and the signed-in user's own profile.
 */
export type EndpointGroup = 'management' | 'selfService';

export type EndpointOverrides = NonNullable<ThunderIDBrowserConfig['endpoints']>;

export interface EndpointSpec {
  key: ResourceEndpointKey;
  /** Path the SDK appends to `baseUrl` when the key is not overridden. */
  path: string;
  group: EndpointGroup;
}

export interface ResolvedEndpoint extends EndpointSpec {
  source: 'default' | 'override';
  url: string;
}

/**
 * Every resource endpoint key the SDK accepts in `endpoints`, with its default path. The SDK keeps
 * these paths inside each API function, so the playground mirrors them to show the effective URL.
 */
export const ENDPOINT_SPECS: EndpointSpec[] = [
  {key: 'applications', path: 'applications', group: 'management'},
  {key: 'users', path: 'users', group: 'management'},
  {key: 'userTypes', path: 'user-types', group: 'management'},
  {key: 'groups', path: 'groups', group: 'management'},
  {key: 'roles', path: 'roles', group: 'management'},
  {key: 'agents', path: 'agents', group: 'management'},
  {key: 'agentTypes', path: 'agent-types', group: 'management'},
  {key: 'flows', path: 'flows', group: 'management'},
  {key: 'flowExecute', path: 'flow/execute', group: 'selfService'},
  {key: 'flowMeta', path: 'flow/meta', group: 'selfService'},
  {key: 'usersMe', path: 'users/me', group: 'selfService'},
  {key: 'usersMeMeta', path: 'users/me/meta', group: 'selfService'},
  {key: 'usersMeCredentials', path: 'users/me/update-credentials', group: 'selfService'},
];

/** `agentTypes` reads `VITE_THUNDERID_ENDPOINT_AGENT_TYPES`. */
export const endpointEnvKey = (key: ResourceEndpointKey): string =>
  `VITE_THUNDERID_ENDPOINT_${key.replace(/[A-Z]/g, (char: string) => `_${char}`).toUpperCase()}`;

/**
 * Builds the `endpoints` prop from the per-key overrides (VITE_THUNDERID_ENDPOINT_<KEY>). Returns
 * `undefined` when nothing is set, so the SDK keeps its defaults (`{baseUrl}/{path}`).
 */
export const buildEndpointOverrides = (
  perKey: (key: ResourceEndpointKey) => string | undefined,
): EndpointOverrides | undefined => {
  const entries: [ResourceEndpointKey, string][] = ENDPOINT_SPECS.flatMap(({key}: EndpointSpec) => {
    const url: string | undefined = perKey(key);

    return url ? [[key, url] as [ResourceEndpointKey, string]] : [];
  });

  return entries.length ? (Object.fromEntries(entries) as EndpointOverrides) : undefined;
};

/**
 * Resolves the URL each resource endpoint is called on: the `endpoints` override read through the
 * SDK's `resolveResourceEndpoint`, otherwise `{baseUrl}/{path}`.
 */
export const resolveEndpoints = (
  baseUrl: string | undefined,
  endpoints: EndpointOverrides | undefined,
): ResolvedEndpoint[] =>
  ENDPOINT_SPECS.map((spec: EndpointSpec) => {
    const override: string | undefined = resolveResourceEndpoint(spec.key, {endpoints});

    return {...spec, source: override ? 'override' : 'default', url: override ?? `${baseUrl ?? ''}/${spec.path}`};
  });
