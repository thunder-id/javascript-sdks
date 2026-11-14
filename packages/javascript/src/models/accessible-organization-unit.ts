// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * An organization unit the signed-in user can access: the one the user lives in, or one the user is
 * shared into.
 */
export interface AccessibleOrganizationUnit {
  handle: string;
  id: string;
  logoUrl?: string;
  name: string;
}

/**
 * Narrows the accessible organization units, relative to the current one.
 *
 * - `siblings`: the current unit and the accessible units that share its parent.
 */
export type AccessibleOrganizationUnitScope = 'siblings';

/**
 * One page of the organization units the signed-in user can access, from `/users/me/ous`.
 */
export interface AccessibleOrganizationUnitList {
  /**
   * Number of units in this page.
   */
  count: number;
  /**
   * Identifier of the organization unit the list is relative to: the one the caller's token was issued
   * for, or the user's own when the token names none. Returned whatever the scope or page.
   */
  current: string;
  organizationUnits: AccessibleOrganizationUnit[];
  /**
   * One-based index of the first unit in this page.
   */
  startIndex: number;
  /**
   * Number of units the listing matches.
   */
  totalResults: number;
}

/**
 * Options for listing the signed-in user's accessible organization units.
 */
export interface AccessibleOrganizationUnitsOptions {
  /**
   * Maximum number of units to return.
   */
  limit?: number;
  /**
   * Zero-based offset of the first unit to return.
   */
  offset?: number;
  /**
   * Narrows the list relative to the current unit. Omit to list every accessible unit.
   */
  scope?: AccessibleOrganizationUnitScope;
}

/**
 * The organization unit the signed-in session was issued for, read from the session's `ouId`,
 * `ouHandle` and `ouName` claims.
 *
 * It is for display only and MUST NOT be used for an authorization decision: the server decides.
 */
export interface CurrentOrganizationUnit {
  handle?: string;
  id: string;
  name?: string;
}

/**
 * Options for {@link ThunderIDClient.switchOrganizationUnit}.
 */
export interface SwitchOrganizationUnitOptions {
  /**
   * Redirect and backend modes in a browser: when the server needs the user (for example no SSO session
   * reaches the unit), fall back to a full-page redirect to the unit's authorization endpoint, or in
   * backend mode to the backend's sign-in endpoint with `ouId`. Defaults to `true`. Set it to `false` to
   * fail with `interaction_required` instead.
   */
  redirect?: boolean;
  /**
   * Extra authorization request parameters to send with the bounded sign-in.
   */
  [key: string]: unknown;
}

/**
 * Error codes {@link ThunderIDClient.switchOrganizationUnit} fails with. The previous session is left
 * as it was in every case.
 */
export const OrganizationUnitSwitchErrorCodes: {
  readonly Failed: 'switchOrganizationUnit-ResponseError-001';
  readonly InteractionRequired: 'switchOrganizationUnit-InteractionRequired-001';
  readonly InvalidOrganizationUnit: 'switchOrganizationUnit-ValidationError-001';
  readonly UnauthorizedClient: 'switchOrganizationUnit-UnauthorizedClient-001';
} = {
  /**
   * The bounded sign-in failed for another reason. The server's OAuth `error` is the message.
   */
  Failed: 'switchOrganizationUnit-ResponseError-001',
  /**
   * The server needs the user to sign in again, and the switch was not allowed to interact.
   */
  InteractionRequired: 'switchOrganizationUnit-InteractionRequired-001',
  /**
   * No organization unit identifier was given.
   */
  InvalidOrganizationUnit: 'switchOrganizationUnit-ValidationError-001',
  /**
   * The unit does not exist, or the application cannot be used from it. The server answers both with
   * `unauthorized_client`, so they cannot be told apart.
   */
  UnauthorizedClient: 'switchOrganizationUnit-UnauthorizedClient-001',
};

/**
 * OAuth errors that send a switch on to a sign-in the user takes part in, rather than failing it.
 */
export const OrganizationUnitSwitchFallbackErrors: {
  readonly Interaction: readonly string[];
  readonly UnusableDeviceSecret: readonly string[];
} = {
  /**
   * The server needs the user.
   */
  Interaction: ['interaction_required', 'login_required', 'consent_required', 'account_selection_required'],
  /**
   * The server cannot use the session's device secret, which the SDK has dropped.
   */
  UnusableDeviceSecret: ['invalid_request', 'invalid_grant'],
};
