// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  OrganizationUnitSwitchErrorCodes,
  OrganizationUnitSwitchFallbackErrors,
  ThunderIDAPIError,
} from '@thunderid/browser';
import NuxtAPIRoutes from '../constants/NuxtAPIRoutes';
import type {ThunderIDAuthState} from '../types';

/**
 * Asks `POST /api/auth/switch` to switch the session to the organization unit `organizationUnitId` with
 * its device secret, without leaving the page.
 *
 * @returns The new auth state, or `undefined` when the user has to sign in to the unit instead: the
 *   session holds no device secret, the server cannot use it or needs the user, or there is no session.
 * @throws {ThunderIDAPIError} `UnauthorizedClient` when the application cannot be used from the unit,
 *   `Failed` on any other refusal. The session stays as it was.
 */
const switchOrganizationUnitOnServer = async (organizationUnitId: string): Promise<ThunderIDAuthState | undefined> => {
  try {
    return await $fetch<ThunderIDAuthState>(NuxtAPIRoutes.SWITCH, {
      body: {ouId: organizationUnitId},
      method: 'POST',
      query: {ouId: organizationUnitId},
    });
  } catch (caught: unknown) {
    const {data, statusCode} = (caught ?? {}) as {data?: {error?: unknown}; statusCode?: number};
    const error: string = typeof data?.error === 'string' ? data.error : 'server_error';

    if (
      statusCode === 401 ||
      OrganizationUnitSwitchFallbackErrors.Interaction.includes(error) ||
      OrganizationUnitSwitchFallbackErrors.UnusableDeviceSecret.includes(error)
    ) {
      return undefined;
    }

    const unauthorized: boolean = error === 'unauthorized_client';

    throw new ThunderIDAPIError(
      JSON.stringify({code: error, message: {defaultValue: error}}),
      unauthorized ? OrganizationUnitSwitchErrorCodes.UnauthorizedClient : OrganizationUnitSwitchErrorCodes.Failed,
      'nuxt',
      unauthorized ? 400 : statusCode,
      undefined,
      'Switching the organization unit failed',
    );
  }
};

export default switchOrganizationUnitOnServer;
