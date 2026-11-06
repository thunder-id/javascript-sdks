// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The client metadata of a dynamic client registration (RFC 7591). The SDK sends it in the
 * protocol's snake_case form (`redirectUris` as `redirect_uris`, and so on).
 */
export interface ClientRegistrationMetadata {
  backchannelLogoutUri?: string;
  clientName?: string;
  clientUri?: string;
  contacts?: string[];
  grantTypes?: string[];
  idTokenEncryptedResponseAlg?: string;
  idTokenEncryptedResponseEnc?: string;
  idTokenSignedResponseAlg?: string;
  /**
   * A JSON Web Key Set, sent as given.
   */
  jwks?: Record<string, unknown>;
  jwksUri?: string;
  logoUri?: string;
  /**
   * The organization unit to register the client in.
   */
  ouId?: string;
  policyUri?: string;
  postLogoutRedirectUris?: string[];
  redirectUris?: string[];
  requirePushedAuthorizationRequests?: boolean;
  responseTypes?: string[];
  scope?: string;
  tokenEndpointAuthMethod?: string;
  tosUri?: string;
  userinfoEncryptedResponseAlg?: string;
  userinfoEncryptedResponseEnc?: string;
  userinfoSignedResponseAlg?: string;
}

/**
 * The payload used to register a client.
 */
export interface ClientRegistrationRequest extends ClientRegistrationMetadata {
  redirectUris: string[];
}

/**
 * The payload used to replace a client's registration (RFC 7592). The update is a full replacement:
 * omitted fields are not kept. The SDK sets `client_id` from the client being updated.
 */
export interface ClientRegistrationUpdateRequest extends ClientRegistrationRequest {
  /**
   * The client's current secret. Only verified by the server, never written.
   */
  clientSecret?: string;
}

/**
 * A dynamically registered client.
 */
export interface ClientRegistration extends ClientRegistrationMetadata {
  /**
   * The internal application ID.
   */
  appId?: string;
  clientId: string;
  /**
   * The client secret. Returned only by the registration; it cannot be read back afterwards. Treat it
   * as a secret: do not log or display it.
   */
  clientSecret?: string;
  /**
   * When the secret expires, in seconds since the epoch, or `0` when it never does.
   */
  clientSecretExpiresAt: number;
}
