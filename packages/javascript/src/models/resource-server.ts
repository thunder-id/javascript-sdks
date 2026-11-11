// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiPaginationLink} from './api';

/**
 * The kind of API a resource server describes.
 */
export type ResourceServerType = 'API' | 'MCP' | 'CUSTOM';

/**
 * How a resource server's permissions are evaluated.
 */
export interface ResourceServerAuthorizationEngine {
  properties?: {
    /**
     * The AuthZEN PDP connection that evaluates requests, when `type` is `authzen_pdp`.
     */
    pdpConnectionId?: string;
  };
  type?: 'rbac' | 'authzen_pdp';
}

/**
 * A resource server: an API whose resources and actions roles grant permissions on.
 */
export interface ResourceServer {
  authorizationEngine?: ResourceServerAuthorizationEngine;
  delimiter: string;
  description?: string | null;
  hierarchicalPermissions?: boolean;
  id: string;
  identifier: string;
  isReadOnly?: boolean;
  name: string;
  ouId: string;
  type: ResourceServerType;
}

/**
 * A page of resource servers.
 */
export interface ResourceServerListResponse {
  count?: number;
  links?: ApiPaginationLink[];
  resourceServers: ResourceServer[];
  startIndex?: number;
  totalResults?: number;
}

/**
 * The payload used to create a resource server.
 */
export interface CreateResourceServerRequest {
  delimiter?: string;
  description?: string;
  hierarchicalPermissions?: boolean;
  identifier: string;
  name: string;
  ouId: string;
  type?: ResourceServerType;
}

/**
 * The payload used to update a resource server.
 */
export interface UpdateResourceServerRequest {
  authorizationEngine?: ResourceServerAuthorizationEngine;
  description?: string;
  identifier?: string;
  name: string;
  ouId: string;
}

/**
 * A resource of a resource server.
 */
export interface ManagedResource {
  description?: string | null;
  handle: string;
  id: string;
  name: string;
  /**
   * Identifier of the parent resource, for a nested resource.
   */
  parent?: string;
  /**
   * The permission string the resource grants.
   */
  permission: string;
}

/**
 * A page of resources.
 */
export interface ManagedResourceListResponse {
  count?: number;
  links?: ApiPaginationLink[];
  resources: ManagedResource[];
  startIndex?: number;
  totalResults?: number;
}

/**
 * The payload used to create a resource.
 */
export interface CreateResourceRequest {
  description?: string;
  handle: string;
  name: string;
  parent?: string | null;
}

/**
 * The payload used to update a resource.
 */
export interface UpdateResourceRequest {
  description?: string;
  name?: string;
}

/**
 * What an action is: a tool an agent calls, or an operation on a resource.
 */
export type ManagedActionKind = 'tool' | 'resource';

/**
 * An action on a resource server or on one of its resources.
 */
export interface ManagedAction {
  description?: string | null;
  handle: string;
  id: string;
  kind?: ManagedActionKind;
  name: string;
  /**
   * The permission string the action grants.
   */
  permission: string;
}

/**
 * A page of actions.
 */
export interface ManagedActionListResponse {
  actions: ManagedAction[];
  count?: number;
  links?: ApiPaginationLink[];
  startIndex?: number;
  totalResults?: number;
}

/**
 * The payload used to create an action.
 */
export interface CreateActionRequest {
  description?: string;
  handle: string;
  kind?: ManagedActionKind;
  name: string;
}

/**
 * The payload used to update an action.
 */
export interface UpdateActionRequest {
  description?: string;
  name?: string;
}

/**
 * A permission a role can be granted on a resource server: the permission string of one of its actions.
 */
export interface ResourceServerPermission {
  /**
   * Display name of the action that grants the permission.
   */
  name: string;
  permission: string;
  /**
   * Display name of the resource the action belongs to. Absent for an action on the resource server itself.
   */
  resourceName?: string;
}
