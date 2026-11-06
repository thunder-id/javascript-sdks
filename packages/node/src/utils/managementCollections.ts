// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowType, resolveResourceEndpoint} from '@thunderid/javascript';
import type {ResourceEndpointConfig, ResourceEndpointKey} from '@thunderid/javascript';

// The server side of a management relay: a framework SDK that keeps the access token on the server
// (Next.js, Nuxt) forwards the browser's management requests only to these collections.

/**
 * The management collections a browser may reach through a server-side management relay, keyed by
 * their `endpoints` override key, with the path each one has under `baseUrl`.
 */
export const MANAGEMENT_COLLECTIONS: Readonly<
  Record<
    Extract<
      ResourceEndpointKey,
      | 'agents'
      | 'agentTypes'
      | 'applications'
      | 'authorizationDetailTypes'
      | 'clientRegistrations'
      | 'configurationVersions'
      | 'connections'
      | 'credentialConfigurations'
      | 'design'
      | 'export'
      | 'flows'
      | 'gateways'
      | 'groups'
      | 'i18n'
      | 'import'
      | 'notificationTemplates'
      | 'organizationUnits'
      | 'presentationDefinitions'
      | 'projects'
      | 'resourceServers'
      | 'roles'
      | 'secrets'
      | 'serverConfig'
      | 'users'
      | 'userTypes'
      | 'variables'
    >,
    string
  >
> = {
  agentTypes: 'agent-types',
  agents: 'agents',
  applications: 'applications',
  authorizationDetailTypes: 'authorization-detail-types',
  clientRegistrations: 'oauth2/dcr/register',
  configurationVersions: 'configuration-versions',
  connections: 'connections',
  credentialConfigurations: 'openid4vci/credential-configurations',
  design: 'design',
  export: 'export',
  flows: 'flows',
  gateways: 'gateways',
  groups: 'groups',
  i18n: 'i18n',
  import: 'import',
  notificationTemplates: 'notification-templates',
  organizationUnits: 'organization-units',
  presentationDefinitions: 'openid4vp/presentation-definitions',
  projects: 'projects',
  resourceServers: 'resource-servers',
  roles: 'roles',
  secrets: 'secrets',
  serverConfig: 'server-config',
  userTypes: 'user-types',
  users: 'users',
  variables: 'variables',
};

export type ManagementCollectionKey = keyof typeof MANAGEMENT_COLLECTIONS;

export const MANAGEMENT_COLLECTION_KEYS: ManagementCollectionKey[] = Object.keys(
  MANAGEMENT_COLLECTIONS,
) as ManagementCollectionKey[];

/**
 * The collection URLs a management request may target for this configuration: each collection's
 * `endpoints` override, or `{baseUrl}/{path}` and the organization-scoped `{baseUrl}/o/{path}`.
 */
export const getManagementCollectionUrls = (
  config: (ResourceEndpointConfig & {baseUrl?: string}) | undefined,
): URL[] => {
  const urls: URL[] = [];
  const baseUrl: string | undefined = config?.baseUrl?.replace(/\/+$/, '');

  MANAGEMENT_COLLECTION_KEYS.forEach((key: ManagementCollectionKey) => {
    const override: string | undefined = resolveResourceEndpoint(key, config);
    const candidates: string[] = override
      ? [override]
      : baseUrl
        ? [`${baseUrl}/${MANAGEMENT_COLLECTIONS[key]}`, `${baseUrl}/o/${MANAGEMENT_COLLECTIONS[key]}`]
        : [];

    candidates.forEach((candidate: string) => {
      try {
        urls.push(new URL(candidate.replace(/\/+$/, '')));
      } catch {
        // An unparsable override cannot match any request.
      }
    });
  });

  return urls;
};

/**
 * Whether `target` addresses one of the management collections, or a resource or sub-resource under
 * one. The comparison runs on the parsed URL, so dot segments are resolved before it, and an
 * encoded slash, backslash or dot, which an upstream could decode into a different path, is refused.
 *
 * @param target - The absolute URL the browser asked for.
 * @param collections - The allowed collection URLs, from {@link getManagementCollectionUrls}.
 * @returns The parsed URL when it is allowed, otherwise `undefined`.
 */
export const matchManagementUrl = (target: unknown, collections: URL[]): URL | undefined => {
  if (typeof target !== 'string' || target.length > 4096) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(target);
  } catch {
    return undefined;
  }

  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || url.hash) {
    return undefined;
  }

  if (/%(2e|2f|5c)/i.test(url.pathname)) {
    return undefined;
  }

  const allowed: boolean = collections.some((collection: URL) => {
    if (collection.origin !== url.origin) {
      return false;
    }

    const base: string = collection.pathname.replace(/\/+$/, '');

    return url.pathname === base || url.pathname.startsWith(`${base}/`);
  });

  return allowed ? url : undefined;
};

/**
 * Whether a relayed request starts an administrator-initiated flow at `{baseUrl}/flow/execute`, such as
 * `sendUserAttributeVerification`. Only a start is relayed: a `POST` whose JSON body names the
 * `ADMIN_INITIATED` flow type and no execution. The server gates such a start on the caller's own
 * permission, and the user continues it from the link without a token, so the relay never adds the
 * token to any other flow request.
 *
 * @param target - The absolute URL the browser asked for.
 * @param method - The request method, upper case.
 * @param body - The serialized request body.
 * @param baseUrl - The server URL from the configuration.
 * @returns The parsed URL when the request is such a start, otherwise `undefined`.
 */
export const matchAdminInitiatedFlowStart = (
  target: unknown,
  method: string,
  body: unknown,
  baseUrl: string | undefined,
): URL | undefined => {
  if (method !== 'POST' || typeof body !== 'string' || !baseUrl) {
    return undefined;
  }

  let executeUrl: URL;

  try {
    executeUrl = new URL(`${baseUrl.replace(/\/+$/, '')}/flow/execute`);
  } catch {
    return undefined;
  }

  const url: URL | undefined = matchManagementUrl(target, [executeUrl]);

  if (url?.pathname !== executeUrl.pathname || url.search) {
    return undefined;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(body);
  } catch {
    return undefined;
  }

  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const start: Record<string, unknown> = payload as Record<string, unknown>;
  // The server accepts case-insensitive keys. Allow only the canonical start fields.
  const fields: string[] = ['flowType', 'handle', 'inputs', 'verbose'];

  return start['flowType'] === EmbeddedFlowType.AdminInitiated &&
    Object.keys(start).every((key) => fields.includes(key))
    ? url
    : undefined;
};
