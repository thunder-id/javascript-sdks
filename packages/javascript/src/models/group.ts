// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiPaginationLink} from './api';

/**
 * The kinds of identity a group can hold.
 */
export type GroupMemberType = 'user' | 'group' | 'agent';

/**
 * A member of a group.
 */
export interface GroupMember {
  /**
   * Display value of the member. Present when the list was requested with `include=display`.
   */
  display?: string;
  id: string;
  type: GroupMemberType;
}

/**
 * A group of users, agents and other groups.
 */
export interface Group {
  description?: string;
  id: string;
  members?: GroupMember[];
  name: string;
  ouHandle?: string;
  ouId: string;
}

/**
 * A page of groups.
 */
export interface GroupListResponse {
  count: number;
  groups: Group[];
  links?: ApiPaginationLink[];
  startIndex: number;
  totalResults: number;
}

/**
 * A page of group members.
 */
export interface GroupMemberListResponse {
  count: number;
  links?: ApiPaginationLink[];
  members: GroupMember[];
  startIndex: number;
  totalResults: number;
}

/**
 * The payload used to create a group.
 */
export interface CreateGroupRequest {
  description?: string;
  members?: Pick<GroupMember, 'id' | 'type'>[];
  name: string;
  ouId: string;
}

/**
 * The payload used to update a group.
 */
export interface UpdateGroupRequest {
  description?: string;
  name: string;
  ouId: string;
}

/**
 * A group an identity belongs to, as listed from the identity's side (`/users/{id}/groups`,
 * `/agents/{id}/groups`).
 */
export interface MembershipGroup {
  id: string;
  name: string;
  ouId: string;
}

/**
 * A page of the groups an identity belongs to.
 */
export interface MembershipGroupListResponse {
  count: number;
  groups: MembershipGroup[];
  links?: ApiPaginationLink[];
  startIndex: number;
  totalResults: number;
}
