// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiPaginationLink} from './api';

/**
 * A flow definition as listed by the ThunderID management API.
 */
export interface ManagedFlow {
  activeVersion: number;
  createdAt?: string;
  flowType: string;
  handle: string;
  id: string;
  isReadOnly?: boolean;
  name: string;
  updatedAt?: string;
}

/**
 * A page of flows.
 */
export interface ManagedFlowListResponse {
  count: number;
  flows: ManagedFlow[];
  links?: ApiPaginationLink[];
  startIndex: number;
  totalResults: number;
}

/**
 * One node of a flow graph.
 */
export interface ManagedFlowNode {
  condition?: {key: string; onSkip: string; value: string};
  executor?: {inputs?: Record<string, unknown>[]; mode?: string; name: string};
  flow?: {ref: string};
  id: string;
  layout?: {position?: {x: number; y: number}; size?: {height: number; width: number}};
  message?: string;
  meta?: Record<string, unknown>;
  next?: string;
  onFailure?: string;
  onIncomplete?: string;
  onSuccess?: string;
  prompts?: Record<string, unknown>[];
  properties?: Record<string, unknown>;
  /**
   * The node type: `START`, `PROMPT`, `TASK_EXECUTION`, `CALL` or `END`.
   */
  type: string;
  variant?: string;
}

/**
 * A flow with its graph.
 */
export interface ManagedFlowDefinition extends ManagedFlow {
  nodes: ManagedFlowNode[];
}

/**
 * The payload used to create or update a flow.
 */
export interface ManagedFlowRequest {
  flowType: string;
  handle: string;
  name: string;
  nodes: ManagedFlowNode[];
}

/**
 * One version in a flow's history.
 */
export interface ManagedFlowVersionInfo {
  createdAt: string;
  isActive: boolean;
  version: number;
}

/**
 * A flow's version history.
 */
export interface ManagedFlowVersionListResponse {
  totalVersions?: number;
  versions?: ManagedFlowVersionInfo[];
}

/**
 * One version of a flow, with its graph.
 */
export interface ManagedFlowVersion {
  createdAt?: string;
  flowType: string;
  handle: string;
  id: string;
  isActive: boolean;
  name: string;
  nodes: ManagedFlowNode[];
  version: number;
}

/**
 * The value of a flow variable, in the variable's own type. A value is never null.
 */
export type FlowVariableValue = string | number | boolean;

/**
 * The values an organization unit has set for a flow's variables: its own overrides, keyed by variable
 * identifier. A variable the unit has not set is absent, and the flow's default applies to it.
 */
export interface FlowVariables {
  values: Record<string, FlowVariableValue>;
}
