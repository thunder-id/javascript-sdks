// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {
  AuthenticationChallenge,
  INSUFFICIENT_USER_AUTHENTICATION,
  ThunderIDAPIError,
  UpdateMeProfileConfig,
  User,
} from '@thunderid/node';
import getClient from '../../getClient';

/**
 * Server action that updates the signed-in user's profile. When the change needs a more recent sign-in
 * (`AUTH-4011`), the result carries the server's `authenticationChallenge`.
 */
const updateUserProfileAction = async (
  payload: UpdateMeProfileConfig,
  sessionId?: string,
): Promise<{
  authenticationChallenge?: AuthenticationChallenge;
  data: {user: User};
  error: string;
  success: boolean;
}> => {
  try {
    const client = getClient();
    const user: User = await client.updateUserProfile(payload, sessionId);
    return {data: {user}, error: '', success: true};
  } catch (error) {
    const challenge: AuthenticationChallenge | undefined =
      error instanceof ThunderIDAPIError ? error.authenticationChallenge : undefined;

    return {
      ...(challenge?.error === INSUFFICIENT_USER_AUTHENTICATION ? {authenticationChallenge: {...challenge}} : {}),
      data: {
        user: {},
      },
      error: `Failed to get user profile: ${error instanceof Error ? error.message : String(error)}`,
      success: false,
    };
  }
};

export default updateUserProfileAction;
