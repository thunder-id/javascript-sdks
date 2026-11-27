// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {defineEventHandler} from 'h3';
import type {H3Event} from 'h3';
import type {ThunderIDAuthState} from '../../../../types';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {verifyAndRehydrateSession} from '../../../utils/serverSession';
import {useRuntimeConfig} from '#imports';

/**
 * GET /api/auth/session
 *
 * Returns the current auth state: { isSignedIn, user, isLoading, organizationId, scopes }.
 * Used by the client-side composable to hydrate auth state.
 */
export default defineEventHandler(async (event: H3Event): Promise<ThunderIDAuthState> => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const sessionSecret: string | undefined = config.thunderid?.sessionSecret;

  const session: Awaited<ReturnType<typeof verifyAndRehydrateSession>> = await verifyAndRehydrateSession(
    event,
    sessionSecret,
  );
  if (!session) {
    return {isLoading: false, isSignedIn: false, user: null};
  }

  try {
    const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
    const user: Awaited<ReturnType<ThunderIDNuxtClient['getUser']>> = await client.getUser(session.sessionId);
    return {
      expiresAt: session.accessTokenExpiresAt ?? session.exp,
      isLoading: false,
      isSignedIn: true,
      organizationId: session.organizationId,
      scope: session.scopes,
      scopes: session.scopes,
      user,
    };
  } catch {
    return {isLoading: false, isSignedIn: false, user: null};
  }
});
