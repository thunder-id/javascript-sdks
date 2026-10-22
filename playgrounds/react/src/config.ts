// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {MANAGEMENT_KEYS, ManagementKey} from './lib/management';

export type StorageMode = 'sessionStorage' | 'localStorage' | 'browserMemory';

export type ManagementEndpoints = Partial<Record<ManagementKey, string>>;

export interface PlaygroundConfig {
  afterSignInUrl: string;
  afterSignOutUrl: string;
  applicationId?: string;
  baseUrl: string;
  clientId: string;
  /** Management collection overrides passed to the provider's `endpoints`, or undefined for none. */
  endpoints?: ManagementEndpoints;
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

/** VITE_THUNDERID_ENDPOINT_<KEY> names, for example agentTypes -> VITE_THUNDERID_ENDPOINT_AGENT_TYPES. */
export const endpointEnvName = (key: ManagementKey): string =>
  `VITE_THUNDERID_ENDPOINT_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;

/**
 * Builds the `endpoints` override from VITE_THUNDERID_ENDPOINT_<KEY>. A collection with no override
 * resolves to `{baseUrl}/{collection}`, the SDK default.
 */
const readEndpoints = (): ManagementEndpoints | undefined => {
  const entries: [ManagementKey, string][] = MANAGEMENT_KEYS.flatMap(
    (key: ManagementKey): [ManagementKey, string][] => {
      const url: string | undefined = read(endpointEnvName(key));

      return url ? [[key, url]] : [];
    },
  );

  return entries.length ? (Object.fromEntries(entries) as ManagementEndpoints) : undefined;
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
