// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The admin (management) components of `@thunderid/vue` that the module auto-imports when
 * `management` is on. The containers fetch through the management composables, so they need no Nuxt
 * wrapper: the module installs the `http.fetcher` they use. The `Base*` variants take their data as
 * props.
 */
export const MANAGEMENT_COMPONENTS: readonly string[] = [
  'UserList',
  'UserCreate',
  'UserDetails',
  'GroupList',
  'GroupCreate',
  'GroupMembers',
  'RoleList',
  'RoleCreate',
  'RoleAssignments',
  'RolePermissions',
  'AgentList',
  'AgentCreate',
  'AgentDetails',
  'BaseUserList',
  'BaseUserCreate',
  'BaseUserDetails',
  'BaseGroupList',
  'BaseGroupCreate',
  'BaseGroupMembers',
  'BaseRoleList',
  'BaseRoleCreate',
  'BaseRoleAssignments',
  'BaseRolePermissions',
  'BaseAgentList',
  'BaseAgentCreate',
  'BaseAgentDetails',
];

/**
 * The management composables of `@thunderid/vue` that the module auto-imports when `management` is
 * on. Same names as the `@thunderid/react` hooks.
 */
export const MANAGEMENT_COMPOSABLES: readonly string[] = [
  'useGetUsers',
  'useGetUser',
  'useCreateUser',
  'useUpdateUser',
  'useDeleteUser',
  'useGetUserGroups',
  'useGetUserTypes',
  'useGetGroups',
  'useGetGroup',
  'useCreateGroup',
  'useUpdateGroup',
  'useDeleteGroup',
  'useGetGroupMembers',
  'useAddGroupMembers',
  'useRemoveGroupMembers',
  'useGetRoles',
  'useGetRole',
  'useCreateRole',
  'useUpdateRole',
  'useDeleteRole',
  'useGetRoleAssignments',
  'useAddRoleAssignments',
  'useRemoveRoleAssignments',
  'useGetAgents',
  'useGetAgent',
  'useCreateAgent',
  'useUpdateAgent',
  'useDeleteAgent',
  'useGetAgentGroups',
  'useGetAgentRoles',
  'useGetAgentTypes',
  'useGrantedPermissions',
];
