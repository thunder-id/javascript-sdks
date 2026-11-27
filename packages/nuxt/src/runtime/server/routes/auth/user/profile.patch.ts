// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {INSUFFICIENT_USER_AUTHENTICATION, ThunderIDAPIError} from '@thunderid/node';
import type {AuthenticationChallenge, UpdateMeProfileConfig, User} from '@thunderid/node';
import {defineEventHandler, readBody, createError} from 'h3';
import type {H3Event} from 'h3';
import type {ThunderIDNuxtConfig} from '../../../../types';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {verifyAndRehydrateSession} from '../../../utils/serverSession';
import {useRuntimeConfig} from '#imports';

/**
 * PATCH /api/auth/user/profile
 *
 * Updates the /users/me profile for the authenticated user.
 * Mirrors the `updateUserProfileAction` Next.js server action.
 *
 * Request body: {@link UpdateMeProfileConfig} (the patch payload).
 * Response: `{ data: { user: User }; success: boolean; error: string }`. When the change needs a more
 * recent sign-in (`AUTH-4011`), the response is `success: false` with the server's
 * `authenticationChallenge`.
 */
export default defineEventHandler(
  async (
    event: H3Event,
  ): Promise<{
    authenticationChallenge?: AuthenticationChallenge;
    data: {user: User};
    error: string;
    success: boolean;
  }> => {
    const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
    const sessionSecret: string | undefined = config.thunderid?.sessionSecret;
    const publicConfig: ThunderIDNuxtConfig = config.public.thunderid as ThunderIDNuxtConfig;

    const session: Awaited<ReturnType<typeof verifyAndRehydrateSession>> = await verifyAndRehydrateSession(
      event,
      sessionSecret,
    );
    if (!session) {
      throw createError({statusCode: 401, statusMessage: 'Unauthorized: Invalid or expired session.'});
    }

    let payload: UpdateMeProfileConfig;
    try {
      payload = await readBody<UpdateMeProfileConfig>(event);
    } catch {
      throw createError({statusCode: 400, statusMessage: 'Invalid request body.'});
    }

    try {
      const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
      const user: User = await client.updateUserProfile(payload, session.sessionId);
      return {data: {user}, error: '', success: true};
    } catch (err) {
      if (err instanceof ThunderIDAPIError && err.authenticationChallenge?.error === INSUFFICIENT_USER_AUTHENTICATION) {
        return {authenticationChallenge: {...err.authenticationChallenge}, data: {user: {}}, error: '', success: false};
      }

      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update user profile: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  },
);
