// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export type StorageMode = 'sessionStorage' | 'localStorage' | 'browserMemory';

export interface PlaygroundConfig {
  afterSignInUrl: string;
  afterSignOutUrl: string;
  applicationId?: string;
  baseUrl: string;
  clientId: string;
  /** `endpoints` overrides for the management collections, from VITE_THUNDERID_ENDPOINT_<KEY>. */
  endpoints: Record<string, string>;
  scopes: string[];
  storage?: StorageMode;
}

const env: Record<string, string | undefined> = import.meta.env as unknown as Record<string, string | undefined>;

const read = (key: string): string | undefined => {
  const value: string | undefined = env[key]?.trim();

  return value === '' ? undefined : value;
};

const readStorage = (value: string | undefined): StorageMode | undefined =>
  value === 'sessionStorage' || value === 'localStorage' || value === 'browserMemory' ? value : undefined;

/**
 * Paths of the management collections under `baseUrl`. `@thunderid/browser` exports
 * no table of these defaults (`MANAGEMENT_COLLECTIONS` lives in `@thunderid/node`), so the
 * playground lists them.
 */
export const MANAGEMENT_PATHS: Record<string, string> = {
  agentTypes: 'agent-types',
  agents: 'agents',
  applications: 'applications',
  flows: 'flows',
  groups: 'groups',
  roles: 'roles',
  userTypes: 'user-types',
  users: 'users',
};

/** VITE_THUNDERID_ENDPOINT_<KEY> names, for example agentTypes -> VITE_THUNDERID_ENDPOINT_AGENT_TYPES. */
export const endpointEnvName = (key: string): string =>
  `VITE_THUNDERID_ENDPOINT_${key.replace(/[A-Z]/g, (char: string) => `_${char}`).toUpperCase()}`;

/** An unset VITE_THUNDERID_ENDPOINT_<KEY> resolves to `{baseUrl}/{path}`, the SDK default. */
const readEndpoints = (): Record<string, string> => {
  const endpoints: Record<string, string> = {};

  Object.keys(MANAGEMENT_PATHS).forEach((key: string) => {
    const value: string | undefined = read(endpointEnvName(key));

    if (value) endpoints[key] = value;
  });

  return endpoints;
};

const playgroundConfig: PlaygroundConfig = {
  afterSignInUrl: read('VITE_THUNDERID_AFTER_SIGN_IN_URL') ?? window.location.origin,
  afterSignOutUrl: read('VITE_THUNDERID_AFTER_SIGN_OUT_URL') ?? window.location.origin,
  applicationId: read('VITE_THUNDERID_APPLICATION_ID'),
  baseUrl: (read('VITE_THUNDERID_BASE_URL') ?? 'https://localhost:8090').replace(/\/+$/, ''),
  clientId: read('VITE_THUNDERID_CLIENT_ID') ?? '',
  endpoints: readEndpoints(),
  scopes: (read('VITE_THUNDERID_SCOPES') ?? 'openid profile email').split(/\s+/).filter(Boolean),
  storage: readStorage(read('VITE_THUNDERID_STORAGE')),
};

export default playgroundConfig;
