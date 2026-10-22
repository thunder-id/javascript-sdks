// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError, type ApiFetcher, type ResourceEndpointKey} from '@thunderid/browser';
import * as ThunderIDVue from '@thunderid/vue';
import type {ManagementEndpoint, ManagementEndpointKey} from '@thunderid/vue';
import {describeError} from './events';
import {
  AgentCreate,
  AgentDetails,
  AgentList,
  BaseAgentCreate,
  BaseAgentDetails,
  BaseAgentList,
  BaseGroupCreate,
  BaseGroupList,
  BaseGroupMembers,
  BaseRoleAssignments,
  BaseRoleCreate,
  BaseRoleList,
  BaseRolePermissions,
  BaseUserCreate,
  BaseUserDetails,
  BaseUserList,
  GroupCreate,
  GroupList,
  GroupMembers,
  RoleAssignments,
  RoleCreate,
  RoleList,
  RolePermissions,
  UserCreate,
  UserDetails,
  UserList,
} from '#components';
import {
  useAddGroupMembers,
  useAddRoleAssignments,
  useCreateAgent,
  useCreateGroup,
  useCreateRole,
  useCreateUser,
  useDeleteAgent,
  useDeleteGroup,
  useDeleteRole,
  useDeleteUser,
  useGetAgent,
  useGetAgentGroups,
  useGetAgentRoles,
  useGetAgents,
  useGetAgentTypes,
  useGetGroup,
  useGetGroupMembers,
  useGetGroups,
  useGetRole,
  useGetRoleAssignments,
  useGetRoles,
  useGetUser,
  useGetUserGroups,
  useGetUsers,
  useGetUserTypes,
  useGrantedPermissions,
  useRemoveGroupMembers,
  useRemoveRoleAssignments,
  useUpdateAgent,
  useUpdateGroup,
  useUpdateRole,
  useUpdateUser,
} from '#imports';

/** The route the module serves when `management` is on. */
export const MANAGEMENT_ROUTE = '/api/auth/management';

/**
 * The management collections the module's route relays, with their default path under `baseUrl` and the
 * variable that overrides them (see nuxt.config.ts).
 */
export const MANAGEMENT_COLLECTIONS: {env: string; key: ManagementEndpointKey; path: string}[] = [
  {env: 'NUXT_PUBLIC_THUNDERID_ENDPOINTS_USERS', key: 'users', path: 'users'},
  {env: 'NUXT_PUBLIC_THUNDERID_ENDPOINTS_USER_TYPES', key: 'userTypes', path: 'user-types'},
  {env: 'NUXT_PUBLIC_THUNDERID_ENDPOINTS_GROUPS', key: 'groups', path: 'groups'},
  {env: 'NUXT_PUBLIC_THUNDERID_ENDPOINTS_ROLES', key: 'roles', path: 'roles'},
  {env: 'NUXT_PUBLIC_THUNDERID_ENDPOINTS_AGENTS', key: 'agents', path: 'agents'},
  {env: 'NUXT_PUBLIC_THUNDERID_ENDPOINTS_AGENT_TYPES', key: 'agentTypes', path: 'agent-types'},
];

/** The resource endpoint keys this SDK version added. */
export const NEW_ENDPOINT_KEYS: ResourceEndpointKey[] = ['agentTypes', 'groups', 'roles'];

export type EndpointOverrides = Partial<Record<ResourceEndpointKey, string>>;

export interface ResolvedEndpoint {
  key: ManagementEndpointKey;
  /** Where the override came from, or `default` when the URL is derived from `baseUrl`. */
  source: string;
  url: string;
}

const trimSlash = (value: string | undefined): string => (value ?? '').replace(/\/+$/, '');

/**
 * Resolves the URL of every management collection the way the management composables do: the
 * `useManagementEndpoint` override, else `{baseUrl}/{path}`.
 */
export const resolveManagementEndpoints = (
  endpoint: (key: ManagementEndpointKey) => ManagementEndpoint,
): ResolvedEndpoint[] =>
  MANAGEMENT_COLLECTIONS.map(({env, key, path}: {env: string; key: ManagementEndpointKey; path: string}) => {
    const {baseUrl, url} = endpoint(key);

    if (!url) return {key, source: 'default', url: `${trimSlash(baseUrl) || '(baseUrl not set)'}/${path}`};

    return {key, source: env, url};
  });

const originOf = (url: string | undefined): string => {
  try {
    return new URL(url ?? '').origin;
  } catch {
    return '';
  }
};

/** Describes the auth server at `baseUrl` and the hosts the management collections resolve to. */
export const describeHosts = (baseUrl: string | undefined, endpoints: ResolvedEndpoint[]): string[] => {
  const base: string = originOf(baseUrl);
  const hosts: string[] = Array.from(new Set(endpoints.map((item: ResolvedEndpoint) => originOf(item.url))));
  const overridden: boolean = endpoints.some((item: ResolvedEndpoint) => item.source !== 'default');

  return [
    `baseUrl       ${base || '(baseUrl not set)'}  OAuth, flows, /users/me`,
    `management    ${hosts.join(', ') || '(not set)'}  ${overridden ? 'overridden' : 'no overrides'}`,
  ];
};

/**
 * Names the module auto-imports when `management` is on, mapped to what `#components` and `#imports`
 * resolve them to. A check compares each one with the export of `@thunderid/vue`.
 */
export const AUTO_IMPORTED_COMPONENTS: Record<string, unknown> = {
  AgentCreate,
  AgentDetails,
  AgentList,
  BaseAgentCreate,
  BaseAgentDetails,
  BaseAgentList,
  BaseGroupCreate,
  BaseGroupList,
  BaseGroupMembers,
  BaseRoleAssignments,
  BaseRoleCreate,
  BaseRoleList,
  BaseRolePermissions,
  BaseUserCreate,
  BaseUserDetails,
  BaseUserList,
  GroupCreate,
  GroupList,
  GroupMembers,
  RoleAssignments,
  RoleCreate,
  RoleList,
  RolePermissions,
  UserCreate,
  UserDetails,
  UserList,
};

export const AUTO_IMPORTED_COMPOSABLES: Record<string, unknown> = {
  useAddGroupMembers,
  useAddRoleAssignments,
  useCreateAgent,
  useCreateGroup,
  useCreateRole,
  useCreateUser,
  useDeleteAgent,
  useDeleteGroup,
  useDeleteRole,
  useDeleteUser,
  useGetAgent,
  useGetAgentGroups,
  useGetAgentRoles,
  useGetAgents,
  useGetAgentTypes,
  useGetGroup,
  useGetGroupMembers,
  useGetGroups,
  useGetRole,
  useGetRoleAssignments,
  useGetRoles,
  useGetUser,
  useGetUserGroups,
  useGetUsers,
  useGetUserTypes,
  useGrantedPermissions,
  useRemoveGroupMembers,
  useRemoveRoleAssignments,
  useUpdateAgent,
  useUpdateGroup,
  useUpdateRole,
  useUpdateUser,
};

/** The names whose auto-import does not resolve to the `@thunderid/vue` export of the same name. */
export const mismatchedAutoImports = (resolved: Record<string, unknown>): string[] =>
  Object.entries(resolved)
    .filter(([name, value]: [string, unknown]) => !value || value !== (ThunderIDVue as Record<string, unknown>)[name])
    .map(([name]: [string, unknown]) => name);

/**
 * Explains a failed management request. The module's route answers with the upstream status, so a
 * missing session, a missing permission and a refused URL each get their own reason.
 */
export const describeManagementError = (error: unknown, clientId: string | undefined): string => {
  if (!(error instanceof ThunderIDAPIError)) return describeError(error);

  switch (error.statusCode) {
    case 401:
      return clientId
        ? `HTTP 401 via ${MANAGEMENT_ROUTE}: no signed-in session, sign in first`
        : `HTTP 401 via ${MANAGEMENT_ROUTE}: no session, NUXT_PUBLIC_THUNDERID_CLIENT_ID is not set`;
    case 403:
      return 'HTTP 403: the access token lacks the permission for this collection';
    case 400:
      return `HTTP 400: ${MANAGEMENT_ROUTE} refused the URL (not a configured management collection)`;
    case 404:
      return 'HTTP 404: the management API has no such collection or resource';
    case 502:
      return `HTTP 502: ${MANAGEMENT_ROUTE} could not reach the management API`;
    default:
      return `HTTP ${String(error.statusCode ?? 0)} ${error.message}`;
  }
};

/**
 * Runs `call` and returns the requests the browser made to the module's management route meanwhile,
 * plus any made straight to another origin. Uses a PerformanceObserver, which still sees entries after
 * the resource timing buffer is full (it fills quickly in dev, where every module is a request).
 */
export const observeManagementRequests = async <T>(
  call: () => Promise<T>,
): Promise<{direct: string[]; relayed: number; result: T | undefined; error: unknown}> => {
  const names: string[] = [];
  const observer: PerformanceObserver | null =
    typeof PerformanceObserver === 'undefined'
      ? null
      : new PerformanceObserver((list: PerformanceObserverEntryList) => {
          list.getEntries().forEach((entry: PerformanceEntry) => names.push(entry.name));
        });

  observer?.observe({type: 'resource'});

  let result: T | undefined;
  let error: unknown;

  try {
    result = await call();
  } catch (caught) {
    error = caught;
  }

  // Resource entries are delivered after the response ends.
  await new Promise((resolve: (value: unknown) => void) => {
    setTimeout(resolve, 300);
  });
  observer?.takeRecords().forEach((entry: PerformanceEntry) => names.push(entry.name));
  observer?.disconnect();

  return {
    direct: names.filter((name: string) => new URL(name).origin !== window.location.origin),
    error,
    relayed: names.filter((name: string) => new URL(name).pathname === MANAGEMENT_ROUTE).length,
    result,
  };
};

/** The management API config the core functions take, with the fetcher the module installs. */
export const requestConfig = (
  endpoint: ManagementEndpoint,
  fetcher: ApiFetcher | undefined,
): ManagementEndpoint & {fetcher?: ApiFetcher} => ({...endpoint, ...(fetcher ? {fetcher} : {})});
