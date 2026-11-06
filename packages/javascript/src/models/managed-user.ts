// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccessStatus} from './access-status';
import {ApiPaginationLink} from './api';
import {VerifiedAttribute} from './user';

/**
 * A user record managed through the ThunderID management API.
 *
 * This is a server record, distinct from {@link User}, which describes the signed-in user.
 */
export interface ManagedUser {
  attributes?: Record<string, unknown>;
  display?: string;
  id: string;
  isReadOnly?: boolean;
  ouHandle?: string;
  ouId: string;
  /**
   * The effective access status, set by the server on a read.
   */
  status?: AccessStatus;
  type: string;
  /**
   * The user's verified attributes, keyed by attribute. Empty when none is verified; absent when the
   * server does not report verification.
   */
  verifiedAttributes?: Record<string, VerifiedAttribute>;
}

/**
 * A page of users.
 */
export interface ManagedUserListResponse {
  count: number;
  links?: ApiPaginationLink[];
  startIndex: number;
  totalResults: number;
  users: ManagedUser[];
}

/**
 * The payload used to create a user.
 */
export interface CreateManagedUserRequest {
  attributes?: Record<string, unknown>;
  groups?: string[];
  ouId: string;
  type: string;
}

/**
 * The payload used to update a user.
 */
export interface UpdateManagedUserRequest {
  attributes?: Record<string, unknown>;
  groups?: string[];
  ouId?: string;
  type?: string;
}

/**
 * A resource that references a user, such as an agent that names the user as its owner.
 */
export interface UserUsage {
  /**
   * What happens to the resource when the user is deleted.
   */
  behaviorOnDelete: 'fallback' | 'cascade' | 'restrict';
  displayName: string;
  id: string;
  resourceType: string;
}

/**
 * The resources that reference a user. `totalResults` and `summary` are `null` when the server could
 * not tell; `0` means there are none.
 */
export interface UserUsagesResponse {
  count: number;
  /**
   * The number of usages of each resource type, such as `agent`.
   */
  summary: Record<string, number> | null;
  totalResults: number | null;
  usages: UserUsage[];
}

/**
 * New values for some of a user's credential attributes, keyed by attribute name.
 */
export interface UpdateUserCredentialsRequest {
  credentials: Record<string, string>;
}

/**
 * The payload used to create a user in the organization unit at a handle path.
 */
export interface CreateUserByPathRequest {
  attributes?: Record<string, unknown>;
  type: string;
}
