// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {CurrentOrganizationUnit, getCurrentOrganizationUnitFromClaims} from '@thunderid/node';
import {decodeJwt} from 'jose';
import getAccessToken from '../getAccessToken';

/**
 * Reads the organization unit the signed-in session was issued for from the `ouId`, `ouHandle` and
 * `ouName` claims of the session's token, or `null` when they are absent (an access token carries
 * `ouId` only when the application's token configuration asks for it). For display only, never for
 * an authorization decision.
 */
const getCurrentOrganizationUnitAction = async (): Promise<CurrentOrganizationUnit | null> => {
  const accessToken: string | undefined = await getAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    return getCurrentOrganizationUnitFromClaims(decodeJwt(accessToken) as Record<string, unknown>);
  } catch {
    return null;
  }
};

export default getCurrentOrganizationUnitAction;
