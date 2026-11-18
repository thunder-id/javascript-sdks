// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccessStatus} from './access-status';
import {AssertionConfig, OAuth2Config, OAuth2GrantTypes} from './application';

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
  /**
   * Asks for consent on every authorization, even when an earlier consent covers it. The server defaults it
   * to `true` for a personal agent and to `false` otherwise.
   */
  alwaysPrompt?: boolean;
  validityPeriod?: number;
}

/**
 * The kind of a personal agent: one that acts only for its owner, a user.
 */
export const PERSONAL_AGENT_KIND = 'personal-assistant';

/**
 * The kind of an agent: a category set when the agent is created and never changed, which can add rules of
 * its own to the agent. Absent for an ordinary agent. Each kind is a constant, such as {@link PERSONAL_AGENT_KIND}.
 */
export type AgentKind = typeof PERSONAL_AGENT_KIND;

/**
 * The only grant types a personal agent can use. Each is labelled by the translation key in
 * {@link PERSONAL_AGENT_GRANT_TYPE_LABEL_KEYS}.
 */
export const PERSONAL_AGENT_GRANT_TYPES: readonly string[] = [
  OAuth2GrantTypes.AUTHORIZATION_CODE,
  OAuth2GrantTypes.CIBA,
  OAuth2GrantTypes.REFRESH_TOKEN,
];

/**
 * The translation key that labels each of the {@link PERSONAL_AGENT_GRANT_TYPES}.
 */
export const PERSONAL_AGENT_GRANT_TYPE_LABEL_KEYS: Readonly<Record<string, string>> = {
  [OAuth2GrantTypes.AUTHORIZATION_CODE]: 'user.agents.grant_types.authorization_code',
  [OAuth2GrantTypes.CIBA]: 'user.agents.grant_types.ciba',
  [OAuth2GrantTypes.REFRESH_TOKEN]: 'user.agents.grant_types.refresh_token',
};

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
  /**
   * The agent's kind, set when the agent is created and never changed. Absent for an ordinary agent.
   */
  kind?: AgentKind;
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
  /**
   * The agent's kind, set when the agent is created and never changed. Absent for an ordinary agent.
   */
  kind?: AgentKind;
  logoUrl?: string;
  ouHandle?: string;
  ouId: string;
  /**
   * The effective access status, set by the server on a read.
   */
  status?: AccessStatus;
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
  /**
   * The agent's kind, fixed once the agent is created. Omit it for an ordinary agent. A kind can add
   * requirements of its own: `personal-assistant` requires `owner` to name a local user.
   */
  kind?: AgentKind;
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

/**
 * The part of a personal agent its owner may change, sent whole: `attributes`, `grantTypes` and
 * `redirectUris` are required, and a `description` left out is cleared.
 */
export interface UpdateMeAgentRequest {
  /**
   * The agent's attributes, as its agent type defines them, including `name`.
   */
  attributes: Record<string, unknown>;
  description?: string;
  /**
   * A subset of {@link PERSONAL_AGENT_GRANT_TYPES}. An empty list removes every grant.
   */
  grantTypes: string[];
  /**
   * At least one when `grantTypes` holds `authorization_code`.
   */
  redirectUris: string[];
}

/**
 * The result of suspending every personal agent of the signed-in user.
 */
export interface SuspendAllMeAgentsResponse {
  /**
   * How many agents the request suspended. Agents the owner had already suspended are not counted.
   */
  suspendedCount: number;
}
