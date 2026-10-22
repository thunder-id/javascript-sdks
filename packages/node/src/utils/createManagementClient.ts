// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  addGroupMembers,
  addRoleAssignments,
  createAgent,
  createGroup,
  createRole,
  createUser,
  deleteAgent,
  deleteGroup,
  deleteRole,
  deleteUser,
  getAgent,
  getAgentGroups,
  getAgentRoles,
  getAgents,
  getAgentTypes,
  getFlows,
  getGroup,
  getGroupMembers,
  getGroups,
  getRole,
  getRoleAssignments,
  getRoles,
  getUser,
  getUserGroups,
  getUsers,
  getUserTypes,
  ManagementRequestConfig,
  removeGroupMembers,
  removeRoleAssignments,
  ThunderIDAPIError,
  updateAgent,
  updateGroup,
  updateRole,
  updateUser,
} from '@thunderid/javascript';
import {
  ManagementCallOptions,
  ManagementRequestConfigResolver,
  ManagementResourceKey,
  ThunderIDNodeManagementClient,
} from '../models/management';

/**
 * Rejects a missing or blank resource identifier before any request is made. The core API functions
 * reject a blank string, but an `undefined` identifier would otherwise address the whole collection,
 * which for a delete or update is never what the caller meant. Uses the same code the core raises.
 */
const requireId = (id: unknown, operation: string): string => {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new ThunderIDAPIError(
      'A resource identifier is required.',
      `${operation}-ValidationError-002`,
      'node',
      400,
      'The provided resource identifier is empty.',
    );
  }

  return id;
};

/**
 * Builds the server-side management client for one session.
 *
 * Each operation resolves its request config through `resolve` at call time, so the access token is
 * read fresh for every request and never held by the returned object.
 *
 * @param resolve - Supplies the base URL, collection URL, and `Authorization` header for a request.
 * @returns The session-bound management operations.
 */
const createManagementClient = (resolve: ManagementRequestConfigResolver): ThunderIDNodeManagementClient => {
  // The resolved config is spread last, so a caller-supplied option can never replace the
  // `Authorization` header or the resolved URL.
  const config = async (
    key: ManagementResourceKey,
    {fetcher, signal, url}: ManagementCallOptions = {},
  ): Promise<ManagementRequestConfig> => ({
    ...(fetcher ? {fetcher} : {}),
    ...(signal ? {signal} : {}),
    ...(await resolve(key, url)),
  });

  return {
    agentTypes: {
      list: async ({limit, offset, ...options} = {}) =>
        getAgentTypes({limit, offset, ...(await config('agentTypes', options))}),
    },
    agents: {
      create: async (payload, options) => createAgent({payload, ...(await config('agents', options))}),
      delete: async (agentId, options) =>
        deleteAgent({agentId: requireId(agentId, 'deleteAgent'), ...(await config('agents', options))}),
      get: async (agentId, options) =>
        getAgent({agentId: requireId(agentId, 'getAgent'), ...(await config('agents', options))}),
      list: async ({filter, limit, offset, ...options} = {}) =>
        getAgents({filter, limit, offset, ...(await config('agents', options))}),
      listGroups: async (agentId, {limit, offset, ...options} = {}) =>
        getAgentGroups({
          agentId: requireId(agentId, 'getAgentGroups'),
          limit,
          offset,
          ...(await config('agents', options)),
        }),
      listRoles: async (agentId, {limit, offset, ...options} = {}) =>
        getAgentRoles({
          agentId: requireId(agentId, 'getAgentRoles'),
          limit,
          offset,
          ...(await config('agents', options)),
        }),
      update: async (agentId, payload, options) =>
        updateAgent({agentId: requireId(agentId, 'updateAgent'), payload, ...(await config('agents', options))}),
    },
    flows: {
      list: async ({flowType, limit, offset, ...options} = {}) =>
        getFlows({flowType, limit, offset, ...(await config('flows', options))}),
    },
    groups: {
      addMembers: async (groupId, members, options) =>
        addGroupMembers({
          groupId: requireId(groupId, 'addGroupMembers'),
          members,
          ...(await config('groups', options)),
        }),
      create: async (payload, options) => createGroup({payload, ...(await config('groups', options))}),
      delete: async (groupId, options) =>
        deleteGroup({groupId: requireId(groupId, 'deleteGroup'), ...(await config('groups', options))}),
      get: async (groupId, options) =>
        getGroup({groupId: requireId(groupId, 'getGroup'), ...(await config('groups', options))}),
      list: async ({limit, offset, ...options} = {}) =>
        getGroups({limit, offset, ...(await config('groups', options))}),
      listMembers: async (groupId, {limit, offset, ...options} = {}) =>
        getGroupMembers({
          groupId: requireId(groupId, 'getGroupMembers'),
          limit,
          offset,
          ...(await config('groups', options)),
        }),
      removeMembers: async (groupId, members, options) =>
        removeGroupMembers({
          groupId: requireId(groupId, 'removeGroupMembers'),
          members,
          ...(await config('groups', options)),
        }),
      update: async (groupId, payload, options) =>
        updateGroup({groupId: requireId(groupId, 'updateGroup'), payload, ...(await config('groups', options))}),
    },
    roles: {
      addAssignments: async (roleId, assignments, options) =>
        addRoleAssignments({
          assignments,
          roleId: requireId(roleId, 'addRoleAssignments'),
          ...(await config('roles', options)),
        }),
      create: async (payload, options) => createRole({payload, ...(await config('roles', options))}),
      delete: async (roleId, options) =>
        deleteRole({roleId: requireId(roleId, 'deleteRole'), ...(await config('roles', options))}),
      get: async (roleId, options) =>
        getRole({roleId: requireId(roleId, 'getRole'), ...(await config('roles', options))}),
      list: async ({limit, offset, ...options} = {}) => getRoles({limit, offset, ...(await config('roles', options))}),
      listAssignments: async (roleId, {limit, offset, type, ...options} = {}) =>
        getRoleAssignments({
          limit,
          offset,
          roleId: requireId(roleId, 'getRoleAssignments'),
          type,
          ...(await config('roles', options)),
        }),
      removeAssignments: async (roleId, assignments, options) =>
        removeRoleAssignments({
          assignments,
          roleId: requireId(roleId, 'removeRoleAssignments'),
          ...(await config('roles', options)),
        }),
      update: async (roleId, payload, options) =>
        updateRole({payload, roleId: requireId(roleId, 'updateRole'), ...(await config('roles', options))}),
    },
    userTypes: {
      list: async ({limit, offset, ...options} = {}) =>
        getUserTypes({limit, offset, ...(await config('userTypes', options))}),
    },
    users: {
      create: async (payload, options) => createUser({payload, ...(await config('users', options))}),
      delete: async (userId, options) =>
        deleteUser({userId: requireId(userId, 'deleteUser'), ...(await config('users', options))}),
      get: async (userId, options) =>
        getUser({userId: requireId(userId, 'getUser'), ...(await config('users', options))}),
      list: async ({filter, limit, offset, ...options} = {}) =>
        getUsers({filter, limit, offset, ...(await config('users', options))}),
      listGroups: async (userId, {limit, offset, ...options} = {}) =>
        getUserGroups({
          limit,
          offset,
          userId: requireId(userId, 'getUserGroups'),
          ...(await config('users', options)),
        }),
      update: async (userId, payload, options) =>
        updateUser({payload, userId: requireId(userId, 'updateUser'), ...(await config('users', options))}),
    },
  };
};

export default createManagementClient;
