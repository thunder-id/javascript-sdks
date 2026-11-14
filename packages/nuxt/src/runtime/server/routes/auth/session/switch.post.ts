// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {DeviceSecretSwitchResult} from '@thunderid/node';
import {defineEventHandler, getQuery, readBody, setResponseStatus} from 'h3';
import type {H3Event} from 'h3';
import type {ThunderIDAuthState} from '../../../../types';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {verifyAndRehydrateSession} from '../../../utils/serverSession';
import {issueSessionCookie} from '../../../utils/session';
import {useRuntimeConfig} from '#imports';

/**
 * POST /api/auth/switch?ouId=<unit id>, with `{"ouId": "<unit id>"}` as the body
 *
 * Switches the session to another organization unit without leaving the page, by exchanging the
 * device secret its sign-in returned (the `device_sso` scope) at the unit's token endpoint. On success
 * the unit's tokens replace the session and its cookie, and the answer is the new auth state.
 *
 * A refusal answers with an OAuth `error` and leaves the session as it was: `401` with `login_required`
 * when there is no session, and `400` with `interaction_required` when the session holds no device
 * secret, or with the token endpoint's error otherwise. The caller signs in to the unit instead when the
 * error says the user has to.
 */
export default defineEventHandler(async (event: H3Event): Promise<ThunderIDAuthState | {error: string}> => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const sessionSecret: string | undefined = config.thunderid?.sessionSecret;

  const body: {ouId?: unknown} | undefined = (await readBody(event).catch((): undefined => undefined)) as
    | {ouId?: unknown}
    | undefined;
  const ouId: unknown = getQuery(event).ouId ?? body?.ouId;

  if (typeof ouId !== 'string' || ouId.trim() === '') {
    setResponseStatus(event, 400);

    return {error: 'invalid_request'};
  }

  const session: Awaited<ReturnType<typeof verifyAndRehydrateSession>> = await verifyAndRehydrateSession(
    event,
    sessionSecret,
  );

  if (!session) {
    setResponseStatus(event, 401);

    return {error: 'login_required'};
  }

  const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
  let result: DeviceSecretSwitchResult | undefined;

  try {
    result = await client.switchOrganizationUnitWithDeviceSecret(ouId, session.sessionId);
  } catch {
    setResponseStatus(event, 502);

    return {error: 'server_error'};
  }

  if (!result || 'error' in result) {
    setResponseStatus(event, 400);

    return {error: result?.error ?? 'interaction_required'};
  }

  await issueSessionCookie(event, session.sessionId, result.tokenResponse, sessionSecret);

  const idToken: Awaited<ReturnType<ThunderIDNuxtClient['getDecodedIdToken']>> = await client.getDecodedIdToken(
    session.sessionId,
    result.tokenResponse.idToken,
  );

  return {
    isLoading: false,
    isSignedIn: true,
    organizationId: (idToken.user_org ?? idToken.organization_id) as string | undefined,
    organizationUnit: await client.getCurrentOrganizationUnit(session.sessionId).catch((): null => null),
    scopes: result.tokenResponse.scope || '',
    user: await client.getUser(session.sessionId),
  };
});
