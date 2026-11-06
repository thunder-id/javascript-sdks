// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The payload used to create or replace an OpenID4VP presentation definition.
 */
export interface PresentationDefinitionRequest {
  /**
   * Values a claim must take, keyed by claim name.
   */
  claimValues?: Record<string, string[]>;
  description?: string;
  enforceTrustedIssuer?: boolean | null;
  /**
   * The credential format. Defaults to `dc+sd-jwt`.
   */
  format?: string;
  /**
   * The definition's unique handle.
   */
  handle: string;
  mandatoryClaims?: string[];
  name?: string;
  optionalClaims?: string[];
  /**
   * The organization unit that owns the definition.
   */
  ouId: string;
  requestedClaims?: string[];
  trustedAuthorities?: string[];
  /**
   * The verifiable credential type URI.
   */
  vct: string;
}

/**
 * An OpenID4VP presentation definition.
 */
export interface PresentationDefinition extends PresentationDefinitionRequest {
  format: string;
  id: string;
  /**
   * The owning organization unit's handle, resolved for display.
   */
  ouHandle?: string;
}

/**
 * A presentation definition as a listing returns it.
 */
export type PresentationDefinitionSummary = Pick<
  PresentationDefinition,
  'format' | 'handle' | 'id' | 'name' | 'ouHandle' | 'ouId' | 'vct'
>;
