// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiPaginationLink} from './api';

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
  type: string;
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
