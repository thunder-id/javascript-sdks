// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The management collections the browser may reach through the SDK's management server action,
 * keyed by their `endpoints` override key. The paths mirror `MANAGEMENT_COLLECTIONS` in
 * `@thunderid/node`, which `@thunderid/nextjs` does not re-export. This module has no imports so
 * server and client code can share it.
 */
export const MANAGEMENT_PATHS = {
  agentTypes: 'agent-types',
  agents: 'agents',
  groups: 'groups',
  roles: 'roles',
  userTypes: 'user-types',
  users: 'users',
} as const;

export type ManagementKey = keyof typeof MANAGEMENT_PATHS;

export const MANAGEMENT_KEYS: ManagementKey[] = Object.keys(MANAGEMENT_PATHS) as ManagementKey[];

/** The management collection keys added with groups and roles management. */
export const NEW_ENDPOINT_KEYS: ManagementKey[] = ['agentTypes', 'groups', 'roles'];

export type ManagementOverrides = Partial<Record<ManagementKey, string>>;

/**
 * Playground-only variables that override where a management collection lives. The SDK reads no
 * environment variable for `endpoints`; the layout passes these to `ThunderIDProvider` instead.
 */
export const ENDPOINT_ENV: Record<ManagementKey, string> = {
  agentTypes: 'THUNDERID_ENDPOINT_AGENT_TYPES',
  agents: 'THUNDERID_ENDPOINT_AGENTS',
  groups: 'THUNDERID_ENDPOINT_GROUPS',
  roles: 'THUNDERID_ENDPOINT_ROLES',
  userTypes: 'THUNDERID_ENDPOINT_USER_TYPES',
  users: 'THUNDERID_ENDPOINT_USERS',
};

/** Where a collection resolves without an override: `{baseUrl}/{path}`, as the core API functions build it. */
export const defaultCollectionUrl = (baseUrl: string, key: ManagementKey): string =>
  `${baseUrl.replace(/\/+$/, '')}/${MANAGEMENT_PATHS[key]}`;
