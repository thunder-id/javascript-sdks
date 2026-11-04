// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * A claim a credential configuration issues.
 */
export interface CredentialConfigurationClaim {
  displayName?: string;
  name: string;
}

/**
 * How a wallet displays a credential.
 */
export interface CredentialConfigurationDisplay {
  locale?: string;
  logoUri?: string;
}

/**
 * The payload used to create or replace an OpenID4VCI credential configuration.
 */
export interface CredentialConfigurationRequest {
  claims?: CredentialConfigurationClaim[];
  description?: string;
  display?: CredentialConfigurationDisplay;
  /**
   * The credential format. Defaults to `dc+sd-jwt`.
   */
  format?: string;
  /**
   * The configuration's unique handle.
   */
  handle: string;
  name?: string;
  /**
   * The organization unit that owns the configuration.
   */
  ouId: string;
  validitySeconds?: number;
  /**
   * The verifiable credential type URI.
   */
  vct: string;
}

/**
 * An OpenID4VCI credential configuration.
 */
export interface CredentialConfiguration extends CredentialConfigurationRequest {
  format: string;
  id: string;
  /**
   * The owning organization unit's handle, resolved for display.
   */
  ouHandle?: string;
}

/**
 * A credential configuration as a listing returns it.
 */
export type CredentialConfigurationSummary = Pick<
  CredentialConfiguration,
  'format' | 'handle' | 'id' | 'name' | 'ouHandle' | 'ouId' | 'vct'
>;
