// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiPaginationLink} from './api';

/**
 * The kinds of identity a role can be assigned to.
 */
export type RoleAssigneeType = 'user' | 'group' | 'app' | 'agent';

/**
 * The permissions a role grants on one resource server.
 */
export interface RoleResourcePermissions {
  permissions: string[];
  resourceServerId: string;
}

/**
 * An identity a role is assigned to.
 */
export interface RoleAssignment {
  /**
   * Display value of the assignee. Present when the list was requested with `include=display`.
   */
  display?: string;
  id: string;
  type: RoleAssigneeType;
}

/**
 * An assignee reference sent when adding or removing role assignments.
 */
export interface RoleAssignmentInput {
  id: string;
  type: RoleAssigneeType;
}

/**
 * The summary of a role returned in list responses.
 */
export interface RoleSummary {
  description?: string;
  id: string;
  isReadOnly?: boolean;
  name: string;
  ouHandle?: string;
  ouId: string;
}

/**
 * A role with the permissions it grants.
 */
export interface Role extends RoleSummary {
  permissions: RoleResourcePermissions[];
}

/**
 * A page of roles.
 */
export interface RoleListResponse {
  count: number;
  links?: ApiPaginationLink[];
  roles: RoleSummary[];
  startIndex: number;
  totalResults: number;
}

/**
 * A page of role assignments.
 */
export interface RoleAssignmentListResponse {
  assignments: RoleAssignment[];
  count: number;
  links?: ApiPaginationLink[];
  startIndex: number;
  totalResults: number;
}

/**
 * The payload used to create a role.
 */
export interface CreateRoleRequest {
  assignments?: RoleAssignmentInput[];
  description?: string;
  name: string;
  ouId: string;
  permissions?: RoleResourcePermissions[];
}

/**
 * The payload used to update a role.
 */
export interface UpdateRoleRequest {
  description?: string;
  name: string;
  ouId: string;
  permissions: RoleResourcePermissions[];
}
