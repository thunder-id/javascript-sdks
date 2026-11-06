// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The subject of an access evaluation (AuthZEN): who acts.
 */
export interface AccessSubject {
  /**
   * The subject identifier, such as a user ID.
   */
  id: string;
  properties?: Record<string, unknown>;
  /**
   * The subject type, such as `user`. When omitted, the server skips subject type validation.
   */
  type?: string;
}

/**
 * The resource of an access evaluation: a resource server identifier as `type`.
 */
export interface AccessResource {
  id?: string;
  properties?: Record<string, unknown>;
  /**
   * The ThunderID resource server identifier, such as `https://api.example.com/booking`.
   */
  type: string;
}

/**
 * The action of an access evaluation: a permission registered under the resource server.
 */
export interface AccessAction {
  /**
   * The permission name, such as `booking:read`.
   */
  name: string;
  properties?: Record<string, unknown>;
}

/**
 * One access evaluation request.
 */
export interface AccessEvaluationRequest {
  action: AccessAction;
  context?: Record<string, unknown>;
  resource: AccessResource;
  subject: AccessSubject;
}

/**
 * A decision. A denial is a result, not an error: an unknown resource or an unregistered action comes
 * back as `decision: false` with the reason in `context`.
 */
export interface AccessEvaluationResponse {
  context?: Record<string, unknown>;
  decision: boolean;
}

/**
 * A batch of evaluations. `defaults` (any of subject, action, resource and context) apply to every
 * evaluation that does not set that member itself.
 */
export interface AccessEvaluationsRequest {
  defaults?: Partial<AccessEvaluationRequest>;
  evaluations: Partial<AccessEvaluationRequest>[];
}

/**
 * Asks which actions a subject may perform on a resource.
 */
export interface AccessActionSearchRequest {
  context?: Record<string, unknown>;
  resource: AccessResource;
  subject: AccessSubject;
}

/**
 * The actions the subject may perform.
 */
export interface AccessActionSearchResponse {
  results: AccessAction[];
}

/**
 * The server's AuthZEN policy decision point metadata, from `/.well-known/authzen-configuration`.
 */
export interface AuthZENConfiguration {
  access_evaluation_endpoint: string;
  access_evaluations_endpoint?: string;
  policy_decision_point: string;
  search_action_endpoint?: string;
}

/**
 * Where access evaluation requests go and how they are authorized.
 */
export interface AccessEvaluationRequestConfig {
  /**
   * The server's base URL. Its `/.well-known/authzen-configuration` supplies the endpoints, and its
   * `policy_decision_point` must match it exactly.
   */
  baseUrl: string;
  /**
   * Explicit endpoint overrides, each on the origin of `baseUrl`. When every endpoint an operation
   * needs is set, the metadata is not fetched.
   */
  endpoints?: {
    evaluation?: string;
    evaluations?: string;
    searchAction?: string;
  };
  /**
   * Optional custom fetcher. Defaults to the global `fetch`.
   */
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  /**
   * The server-level secret, sent in the `Direct-Auth-Secret` header. Never logged.
   */
  secret: string;
  signal?: AbortSignal;
}
