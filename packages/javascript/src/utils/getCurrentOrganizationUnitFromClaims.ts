// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CurrentOrganizationUnit} from '../models/accessible-organization-unit';

const readClaim = (claims: Record<string, unknown>, name: string): string | undefined => {
  const value: unknown = claims[name];

  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

/**
 * Reads the organization unit a session was issued for from its token claims: `ouId`, `ouHandle` and
 * `ouName`, which name the unit the sign-in decided.
 *
 * The claims are read without verifying the token, so the result is for display only and MUST NOT be
 * used for an authorization decision.
 *
 * @param claims - The decoded ID token (or sign-in assertion) payload.
 * @returns The current organization unit, or `null` when the claims carry no `ouId`.
 */
const getCurrentOrganizationUnitFromClaims = (
  claims: Record<string, unknown> | null | undefined,
): CurrentOrganizationUnit | null => {
  if (!claims || typeof claims !== 'object') {
    return null;
  }

  const id: string | undefined = readClaim(claims, 'ouId');

  if (!id) {
    return null;
  }

  const handle: string | undefined = readClaim(claims, 'ouHandle');
  const name: string | undefined = readClaim(claims, 'ouName');

  return {id, ...(handle ? {handle} : {}), ...(name ? {name} : {})};
};

export default getCurrentOrganizationUnitFromClaims;
