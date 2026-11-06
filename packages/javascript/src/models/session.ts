// Copyright 2020-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {AuthorizationDetail} from './oauth-request';

/**
 * An SSO session handle kept from an embedded flow step, presented on later flow requests so the server
 * reuses the session without its cookie.
 */
export interface StoredFlowSession {
  /** When the session reaches its absolute timeout, in milliseconds since the epoch. */
  expiresAt?: number;
  /** Identifies the flow the session belongs to. */
  flowIdentifier: string;
  /** The session handle. */
  sessionHandle: string;
}

export interface SessionData {
  access_token: string;
  authorization_details?: AuthorizationDetail[];
  created_at: number;
  /** The device secret a sign-in with the `device_sso` scope returned, exchanged to switch organization units. */
  device_secret?: string;
  expires_in: string;
  /** The SSO session handles embedded flow steps returned. */
  flow_sessions?: StoredFlowSession[];
  id_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface UserSession {
  authorizationDetails?: AuthorizationDetail[];
  scopes: string[];
}
