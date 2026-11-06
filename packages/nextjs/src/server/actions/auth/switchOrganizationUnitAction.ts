// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {EmbeddedFlowType, OrganizationUnitSwitchErrorCodes} from '@thunderid/node';
import {cookies} from 'next/headers';
import signInAction from './signInAction';
import {ThunderIDNextConfig} from '../../../models/config';
import SessionManager from '../../../utils/SessionManager';
import getClient from '../../getClient';
import getSessionId from '../getSessionId';

type RequestCookies = Awaited<ReturnType<typeof cookies>>;

export type SwitchOrganizationUnitActionResult =
  | {data: {signInUrl?: string; switched?: boolean}; success: true}
  | {code: string; statusCode?: number; success: false};

/**
 * Starts a switch of the signed-in session to the organization unit `organizationUnitId`.
 *
 * - Redirect mode returns the unit's authorization URL (`{baseUrl}/ou/{ouId}/oauth2/authorize`) to send
 *   the browser to, and marks the session so the OAuth callback redeems the code for it: the code is
 *   redeemed at the unit's token endpoint and replaces the session. With `redirect: false` it fails
 *   with `interaction_required` instead, since a server cannot switch silently.
 * - Embedded mode starts an `AUTHENTICATION` flow with `ouId`. When the SSO session is reused the flow
 *   completes at once and its assertion replaces the session cookie; a flow that needs input fails
 *   with `interaction_required`.
 *
 * The previous session stays as it was on any failure. The error code is one of
 * `OrganizationUnitSwitchErrorCodes`.
 */
const switchOrganizationUnitAction = async (
  organizationUnitId: string,
  options: {redirect?: boolean} = {},
): Promise<SwitchOrganizationUnitActionResult> => {
  if (typeof organizationUnitId !== 'string' || organizationUnitId.trim() === '') {
    return {code: OrganizationUnitSwitchErrorCodes.InvalidOrganizationUnit, statusCode: 400, success: false};
  }

  const sessionId: string | undefined = await getSessionId();

  if (!sessionId) {
    return {code: OrganizationUnitSwitchErrorCodes.Failed, statusCode: 401, success: false};
  }

  try {
    const client = getClient();

    if (!client.isInitialized) {
      await client.initialize({} as ThunderIDNextConfig);
    }

    const config: ThunderIDNextConfig = await client.getConfiguration();

    if (config.mode === 'embedded') {
      const result: Awaited<ReturnType<typeof signInAction>> = await signInAction({
        applicationId: config.applicationId,
        flowType: EmbeddedFlowType.Authentication,
        ouId: organizationUnitId,
      });

      if (result.success && (result.data as {afterSignInUrl?: string} | undefined)?.afterSignInUrl) {
        return {data: {switched: true}, success: true};
      }

      if (result.success) {
        return {code: OrganizationUnitSwitchErrorCodes.InteractionRequired, success: false};
      }

      // FES-1023: a unit the application is not accessible from, or one that does not exist.
      return {
        code: (result.error ?? '').includes('FES-1023')
          ? OrganizationUnitSwitchErrorCodes.UnauthorizedClient
          : OrganizationUnitSwitchErrorCodes.Failed,
        success: false,
      };
    }

    if (options.redirect === false) {
      return {code: OrganizationUnitSwitchErrorCodes.InteractionRequired, success: false};
    }

    const signInUrl: string = await client.getAuthorizeRequestUrl({organizationUnitId}, sessionId);
    const cookieStore: RequestCookies = await cookies();

    // The OAuth callback finds the session it completes through the temporary session cookie.
    cookieStore.set(
      SessionManager.getTempSessionCookieName(),
      await SessionManager.createTempSession(sessionId),
      SessionManager.getTempSessionCookieOptions(),
    );

    return {data: {signInUrl}, success: true};
  } catch {
    return {code: OrganizationUnitSwitchErrorCodes.Failed, success: false};
  }
};

export default switchOrganizationUnitAction;
