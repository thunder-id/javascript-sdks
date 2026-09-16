// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {CredentialUpdateErrorResult} from '@thunderid/node';
import {mapCredentialUpdateError} from '@thunderid/node';
import {defineEventHandler, readBody, createError} from 'h3';
import type {H3Event} from 'h3';
import ThunderIDNuxtClient from '../../../ThunderIDNuxtClient';
import {verifyAndRehydrateSession} from '../../../utils/serverSession';
import {useRuntimeConfig} from '#imports';

export interface UpdateUserCredentialsResult extends CredentialUpdateErrorResult {
  success: boolean;
}

interface UpdateUserCredentialsBody {
  payload: Record<string, string>;
}

/**
 * PATCH /api/auth/user/credentials
 *
 * Updates one of the signed-in user's own credentials (e.g. `password`). Mirrors the
 * `updateUserCredentialsAction` Next.js server action.
 *
 * Request body: `{ payload: Record<string, string> }` — `payload` is keyed by credential attribute
 * (e.g. `{ password: "n3wP@ssword!" }`), the same shape `updateMeCredentials`'s own `payload` takes.
 *
 * Response: `{ success: boolean; field: 'newPassword' | null; message?: string; messageKey: string }`.
 * Always resolves 200, even on a failed credential write — the failure is carried in the body
 * (`success: false` plus `field`/`message`/`messageKey`, from {@link mapCredentialUpdateError})
 * rather than the HTTP status, so `<ChangeCredential />`'s client component can attach the
 * error to the right form field without needing to parse a thrown H3 error. A `401` here means
 * the caller's own session is invalid, not that the new credential was rejected — that one
 * still throws, same as every other route in this file.
 */
export default defineEventHandler(async (event: H3Event): Promise<UpdateUserCredentialsResult> => {
  const config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig();
  const sessionSecret: string | undefined = config.thunderid?.sessionSecret;

  const session: Awaited<ReturnType<typeof verifyAndRehydrateSession>> = await verifyAndRehydrateSession(
    event,
    sessionSecret,
  );
  if (!session) {
    throw createError({statusCode: 401, statusMessage: 'Unauthorized: Invalid or expired session.'});
  }

  let body: UpdateUserCredentialsBody;
  try {
    body = await readBody<UpdateUserCredentialsBody>(event);
  } catch {
    throw createError({statusCode: 400, statusMessage: 'Invalid request body.'});
  }

  try {
    const client: ThunderIDNuxtClient = ThunderIDNuxtClient.getInstance();
    await client.updateUserCredentials(body.payload, session.sessionId);
    return {field: null, messageKey: '', success: true};
  } catch (error) {
    const {field, message, messageKey}: CredentialUpdateErrorResult = mapCredentialUpdateError(error);
    return {field, message, messageKey, success: false};
  }
});
