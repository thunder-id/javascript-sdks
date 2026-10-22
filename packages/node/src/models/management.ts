// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Agent,
  AgentListResponse,
  AgentRoleListResponse,
  AgentTypeListResponse,
  ApiFetcher,
  ApiFilteringParams,
  CreateAgentRequest,
  CreateGroupRequest,
  CreateManagedUserRequest,
  CreateRoleRequest,
  Group,
  GroupListResponse,
  GroupMember,
  GroupMemberListResponse,
  ManagedFlowListResponse,
  ManagedUser,
  ManagedUserListResponse,
  ManagedUserTypeListResponse,
  ManagementRequestConfig,
  MembershipGroupListResponse,
  ResourceEndpointKey,
  Role,
  RoleAssigneeType,
  RoleAssignmentInput,
  RoleAssignmentListResponse,
  RoleListResponse,
  UpdateAgentRequest,
  UpdateGroupRequest,
  UpdateManagedUserRequest,
  UpdateRoleRequest,
} from '@thunderid/javascript';

/**
 * The management resource collections the server-side management client addresses.
 */
export type ManagementResourceKey = Extract<
  ResourceEndpointKey,
  'agents' | 'agentTypes' | 'flows' | 'groups' | 'roles' | 'users' | 'userTypes'
>;

/**
 * Per-call options accepted by every management operation.
 */
export interface ManagementCallOptions {
  /**
   * Transport for this call. Takes precedence over the SDK's default `fetch`. The SDK still sets the
   * `Authorization` header; a fetcher cannot be used to drop or replace the session's bearer token.
   */
  fetcher?: ApiFetcher;
  /**
   * Aborts the request.
   */
  signal?: AbortSignal;
  /**
   * Explicit collection URL for this call. Takes precedence over a `config.endpoints` override, which
   * takes precedence over `{baseUrl}/{collection}`. A single resource is addressed as this URL followed
   * by its identifier.
   */
  url?: string;
}

/**
 * Options for a paginated list.
 */
export type ManagementListOptions = ManagementCallOptions & Pick<ApiFilteringParams, 'limit' | 'offset'>;

/**
 * Member reference accepted when adding or removing group members.
 */
export type ManagementGroupMemberInput = Pick<GroupMember, 'id' | 'type'>;

/**
 * Resolves the URL inputs and bearer token for one management request. Implemented by
 * `ThunderIDNodeClient`, which reads the access token of the bound session on every call.
 *
 * @param key - The resource collection the request targets.
 * @param explicitUrl - A collection URL passed to the call, if any.
 */
export type ManagementRequestConfigResolver = (
  key: ManagementResourceKey,
  explicitUrl?: string,
) => Promise<Pick<ManagementRequestConfig, 'baseUrl' | 'url'> & {headers: {Authorization: string}}>;

/**
 * Server-side management operations bound to one session. Every request is authorized with that
 * session's access token, read at the time of the call, so the token is never copied, cached, or
 * exposed to the caller.
 *
 * Resources returned here are server records (`ManagedUser`, `Group`, `Role`, `Agent`), never the
 * signed-in user. Failures are raised as `ThunderIDAPIError`, with HTTP 403 and 404 carrying the
 * `<operation>-ForbiddenError-001` and `<operation>-NotFoundError-001` codes.
 */
export interface ThunderIDNodeManagementClient {
  agentTypes: {
    list(options?: ManagementListOptions): Promise<AgentTypeListResponse>;
  };
  agents: {
    create(payload: CreateAgentRequest, options?: ManagementCallOptions): Promise<Agent>;
    delete(agentId: string, options?: ManagementCallOptions): Promise<void>;
    get(agentId: string, options?: ManagementCallOptions): Promise<Agent>;
    list(options?: ManagementCallOptions & ApiFilteringParams): Promise<AgentListResponse>;
    listGroups(agentId: string, options?: ManagementListOptions): Promise<MembershipGroupListResponse>;
    listRoles(agentId: string, options?: ManagementListOptions): Promise<AgentRoleListResponse>;
    update(agentId: string, payload: UpdateAgentRequest, options?: ManagementCallOptions): Promise<Agent>;
  };
  flows: {
    list(options?: ManagementListOptions & {flowType?: string}): Promise<ManagedFlowListResponse>;
  };
  groups: {
    addMembers(groupId: string, members: ManagementGroupMemberInput[], options?: ManagementCallOptions): Promise<Group>;
    create(payload: CreateGroupRequest, options?: ManagementCallOptions): Promise<Group>;
    delete(groupId: string, options?: ManagementCallOptions): Promise<void>;
    get(groupId: string, options?: ManagementCallOptions): Promise<Group>;
    list(options?: ManagementListOptions): Promise<GroupListResponse>;
    listMembers(groupId: string, options?: ManagementListOptions): Promise<GroupMemberListResponse>;
    removeMembers(
      groupId: string,
      members: ManagementGroupMemberInput[],
      options?: ManagementCallOptions,
    ): Promise<Group>;
    update(groupId: string, payload: UpdateGroupRequest, options?: ManagementCallOptions): Promise<Group>;
  };
  roles: {
    addAssignments(roleId: string, assignments: RoleAssignmentInput[], options?: ManagementCallOptions): Promise<void>;
    create(payload: CreateRoleRequest, options?: ManagementCallOptions): Promise<Role>;
    delete(roleId: string, options?: ManagementCallOptions): Promise<void>;
    get(roleId: string, options?: ManagementCallOptions): Promise<Role>;
    list(options?: ManagementListOptions): Promise<RoleListResponse>;
    listAssignments(
      roleId: string,
      options?: ManagementListOptions & {type?: RoleAssigneeType},
    ): Promise<RoleAssignmentListResponse>;
    removeAssignments(
      roleId: string,
      assignments: RoleAssignmentInput[],
      options?: ManagementCallOptions,
    ): Promise<void>;
    update(roleId: string, payload: UpdateRoleRequest, options?: ManagementCallOptions): Promise<Role>;
  };
  userTypes: {
    list(options?: ManagementListOptions): Promise<ManagedUserTypeListResponse>;
  };
  users: {
    create(payload: CreateManagedUserRequest, options?: ManagementCallOptions): Promise<ManagedUser>;
    delete(userId: string, options?: ManagementCallOptions): Promise<void>;
    get(userId: string, options?: ManagementCallOptions): Promise<ManagedUser>;
    list(options?: ManagementCallOptions & ApiFilteringParams): Promise<ManagedUserListResponse>;
    listGroups(userId: string, options?: ManagementListOptions): Promise<MembershipGroupListResponse>;
    update(userId: string, payload: UpdateManagedUserRequest, options?: ManagementCallOptions): Promise<ManagedUser>;
  };
}
