// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccessStatus} from './access-status';
import {AssertionConfig, OAuth2Config} from './application';

/**
 * Inbound authentication configuration of an agent.
 */
export interface AgentInboundAuthConfig {
  config?: OAuth2Config;
  type: 'oauth2';
}

/**
 * Login consent configuration of an agent.
 */
export interface AgentLoginConsentConfig {
  validityPeriod?: number;
}

/**
 * What an agent owner's `id` holds.
 */
export type AgentOwnerIdType = 'uuid' | 'email' | 'mobile';

/**
 * The person accountable for an agent. A local owner is an entity of the same deployment and is
 * named by its entity ID. An owner managed in another identity system is not looked up.
 */
export interface AgentOwner {
  id: string;
  /**
   * Defaults to `uuid`. A local owner must be a `uuid`.
   */
  idType?: AgentOwnerIdType;
  /**
   * Whether the owner is an entity of this deployment. Defaults to `true`.
   */
  isLocal?: boolean;
}

/**
 * An agent registered in ThunderID.
 */
export interface Agent {
  allowedAgentTypes?: string[];
  allowedUserTypes?: string[];
  assertion?: AssertionConfig;
  /**
   * The agent's attributes, as its agent type defines them. The name is `attributes.name`.
   */
  attributes?: Record<string, unknown>;
  /**
   * Populated only when the agent has an inbound client.
   */
  authFlowId?: string;
  clientId?: string;
  description?: string;
  /**
   * The display value the server resolves from the agent's attributes, returned by reads made with
   * `include=display`. The agent's name lives in `attributes.name`.
   */
  display?: string;
  id: string;
  inboundAuthConfig?: AgentInboundAuthConfig[];
  isReadOnly?: boolean;
  isRegistrationFlowEnabled?: boolean;
  loginConsent?: AgentLoginConsentConfig;
  logoUrl?: string;
  ouHandle?: string;
  ouId: string;
  owner?: AgentOwner;
  registrationFlowId?: string;
  /**
   * The effective access status, set by the server on a read.
   */
  status?: AccessStatus;
  type: string;
}

/**
 * The summary of an agent returned in list responses.
 */
export interface BasicAgent {
  /**
   * The agent's attributes, as its agent type defines them. The name is `attributes.name`.
   */
  attributes?: Record<string, unknown>;
  clientId?: string;
  description?: string;
  /**
   * The display value the server resolves from the agent's attributes, returned by reads made with
   * `include=display`. The agent's name lives in `attributes.name`.
   */
  display?: string;
  id: string;
  isReadOnly?: boolean;
  logoUrl?: string;
  ouHandle?: string;
  ouId: string;
  type: string;
}

/**
 * A page of agents.
 */
export interface AgentListResponse {
  agents: BasicAgent[];
  count: number;
  startIndex: number;
  totalResults: number;
}

/**
 * The payload used to create an agent.
 */
export interface CreateAgentRequest {
  /**
   * The agent's attributes, as its agent type defines them. The name goes in `attributes.name`.
   */
  attributes?: Record<string, unknown>;
  description?: string;
  inboundAuthConfig?: AgentInboundAuthConfig[];
  logoUrl?: string;
  /**
   * The organization unit the agent is created in. Required unless `projectId` is given.
   */
  ouId?: string;
  owner?: AgentOwner;
  /**
   * Creates the agent in the project's root organization unit. Served by the control plane.
   */
  projectId?: string;
  type: string;
}

/**
 * The payload used to update an agent.
 */
export interface UpdateAgentRequest {
  allowedAgentTypes?: string[];
  allowedUserTypes?: string[];
  /**
   * The agent's attributes, as its agent type defines them. The name goes in `attributes.name`.
   */
  attributes?: Record<string, unknown>;
  authFlowId?: string;
  /**
   * Whether the agent acts on behalf of a signed-in user. The server does not store it, so a full
   * update sends it for the agent to be held to the delegated grant rules.
   */
  delegated?: boolean;
  description?: string;
  inboundAuthConfig?: AgentInboundAuthConfig[];
  isRegistrationFlowEnabled?: boolean;
  logoUrl?: string;
  ouId?: string;
  owner?: AgentOwner;
  registrationFlowId?: string;
  type?: string;
}

/**
 * A page of the role names assigned to an agent.
 */
export interface AgentRoleListResponse {
  count: number;
  roles: string[];
  startIndex: number;
  totalResults: number;
}

/**
 * A kind of agent, which defines the attributes its agents carry.
 */
export interface AgentType {
  allowSelfRegistration?: boolean;
  displayName: string;
  handle: string;
  id: string;
  ouHandle?: string;
  ouId: string;
}

/**
 * A page of agent types.
 */
export interface AgentTypeListResponse {
  count: number;
  startIndex: number;
  totalResults: number;
  types: AgentType[];
}
