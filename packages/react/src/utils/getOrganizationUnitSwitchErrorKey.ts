// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {OrganizationUnitSwitchErrorCodes} from '@thunderid/browser';

/**
 * The translation key for a failed organization unit switch, by the error's code. The server answers an
 * unknown unit and a unit the application cannot be used from alike (`unauthorized_client`), so they
 * share one message. Every key takes the unit's `{name}`.
 *
 * @param error - The error `switchOrganizationUnit` rejected with.
 * @returns The `organization_unit.switcher.error.*` key to show.
 */
const getOrganizationUnitSwitchErrorKey = (error: unknown): string => {
  const code: unknown = (error as {code?: unknown} | null)?.code;

  if (code === OrganizationUnitSwitchErrorCodes.UnauthorizedClient) {
    return 'organization_unit.switcher.error.unauthorized';
  }

  if (code === OrganizationUnitSwitchErrorCodes.InteractionRequired) {
    return 'organization_unit.switcher.error.interaction_required';
  }

  return 'organization_unit.switcher.error.switch';
};

export default getOrganizationUnitSwitchErrorKey;
