// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFetcher, ResourceEndpointKey, ThunderIDAPIError, resolveResourceEndpoint} from '@thunderid/browser';
import type {ThunderIDContextProps} from '@thunderid/react';
import {describeError} from './events';

/**
 * The management collections a provider `endpoints` override can move to another host (the data
 * plane), the same set `useManagementEndpoint()` accepts.
 */
export type ManagementKey = Extract<
  ResourceEndpointKey,
  'agents' | 'agentTypes' | 'applications' | 'flows' | 'groups' | 'roles' | 'users' | 'userTypes'
>;

/**
 * Default collection paths under `baseUrl`. The SDK keeps these inside each API function
 * (`resolveResourceEndpoint()` returns `undefined` when there is no override), so the playground
 * mirrors them to show the effective URL. See the README gaps.
 */
export const MANAGEMENT_COLLECTIONS: Record<ManagementKey, string> = {
  agentTypes: 'agent-types',
  agents: 'agents',
  applications: 'applications',
  flows: 'flows',
  groups: 'groups',
  roles: 'roles',
  userTypes: 'user-types',
  users: 'users',
};

export const MANAGEMENT_KEYS: ManagementKey[] = Object.keys(MANAGEMENT_COLLECTIONS) as ManagementKey[];

/** The management keys added with groups and roles management. */
export const NEW_MANAGEMENT_KEYS: ManagementKey[] = ['agentTypes', 'groups', 'roles'];

export interface ResolvedEndpoint {
  key: ManagementKey;
  /** The `endpoints` override, or undefined when the collection lives under `baseUrl`. */
  override: string | undefined;
  url: string;
}

export const resolveManagementEndpoints = (
  baseUrl: string | undefined,
  endpoints: ThunderIDContextProps['endpoints'],
): ResolvedEndpoint[] =>
  MANAGEMENT_KEYS.map((key: ManagementKey) => {
    const override: string | undefined = resolveResourceEndpoint(key, {endpoints});

    return {key, override, url: (override ?? `${baseUrl ?? ''}/${MANAGEMENT_COLLECTIONS[key]}`).replace(/\/+$/, '')};
  });

/**
 * A fetcher that attaches the signed-in user's access token. The hooks use the SDK's internal
 * authenticated fetcher, which is not exported, so the capability checks build their own for the
 * core API functions.
 */
export const createTokenFetcher =
  (getAccessToken: () => Promise<string>): ApiFetcher =>
  async (url: string, init: RequestInit): Promise<Response> => {
    const token: string = await getAccessToken();

    return fetch(url, {
      ...init,
      headers: {...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}`},
    });
  };

/**
 * A fetcher that records each request URL and answers with an empty page, so endpoint routing can
 * be checked without a server.
 */
export const createRecordingFetcher = (urls: string[]): ApiFetcher => {
  const fetcher: ApiFetcher = (url: string): Promise<Response> => {
    urls.push(url);

    return Promise.resolve(new Response('{"count":0,"startIndex":0,"totalResults":0}', {status: 200}));
  };

  return fetcher;
};

/**
 * Turns a management API failure into a reason that says what to fix.
 */
export const describeManagementError = (error: unknown, permission?: string): string => {
  if (!(error instanceof ThunderIDAPIError)) return describeError(error);

  const {message, statusCode} = error;

  if (statusCode === 401) return `401: the access token was rejected; sign in again (${message})`;
  if (statusCode === 403) {
    return `403: the token lacks ${permission ?? 'the permission'}; request it as a scope or grant a role`;
  }
  if (statusCode === 404) return `404: no such resource at this URL; check the endpoints override (${message})`;
  if (!statusCode) return `network error: CORS or an unreachable endpoints override (${message})`;

  return `HTTP ${statusCode}: ${message}`;
};

/**
 * Permissions worth probing with `can()` / `hasPermission()`. The SDK components gate on the
 * `view` ones; the rest show how a parent permission covers its children.
 */
export const PERMISSION_PROBES: string[] = [
  'system',
  'system:user',
  'system:user:view',
  'system:usertype:view',
  'system:group:view',
  'system:role:view',
  'system:agent',
];
