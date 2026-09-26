// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

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
 * An agent registered in ThunderID.
 */
export interface Agent {
  allowedAgentTypes?: string[];
  allowedUserTypes?: string[];
  assertion?: AssertionConfig;
  attributes?: Record<string, unknown>;
  /**
   * Populated only when the agent has an inbound client.
   */
  authFlowId?: string;
  clientId?: string;
  description?: string;
  id: string;
  inboundAuthConfig?: AgentInboundAuthConfig[];
  isReadOnly?: boolean;
  isRegistrationFlowEnabled?: boolean;
  loginConsent?: AgentLoginConsentConfig;
  logoUrl?: string;
  name: string;
  ouHandle?: string;
  ouId: string;
  owner?: string;
  registrationFlowId?: string;
  type: string;
}

/**
 * The summary of an agent returned in list responses.
 */
export interface BasicAgent {
  clientId?: string;
  description?: string;
  id: string;
  isReadOnly?: boolean;
  logoUrl?: string;
  name: string;
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
  attributes?: Record<string, unknown>;
  description?: string;
  inboundAuthConfig?: AgentInboundAuthConfig[];
  logoUrl?: string;
  name: string;
  ouId: string;
  owner?: string;
  type: string;
}

/**
 * The payload used to update an agent.
 */
export interface UpdateAgentRequest {
  allowedAgentTypes?: string[];
  allowedUserTypes?: string[];
  attributes?: Record<string, unknown>;
  authFlowId?: string;
  description?: string;
  inboundAuthConfig?: AgentInboundAuthConfig[];
  isRegistrationFlowEnabled?: boolean;
  logoUrl?: string;
  name?: string;
  ouId?: string;
  owner?: string;
  registrationFlowId?: string;
  type?: string;
}
