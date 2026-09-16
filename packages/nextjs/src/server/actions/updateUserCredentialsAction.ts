// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {CredentialUpdateErrorResult, mapCredentialUpdateError} from '@thunderid/node';
import getClient from '../getClient';

export interface UpdateUserCredentialsActionResult extends CredentialUpdateErrorResult {
  success: boolean;
}

/**
 * Server action to update one of the signed-in user's own credentials (e.g. `password`).
 *
 * Never throws across the server action boundary — a thrown class instance loses its
 * prototype chain crossing it, so `error instanceof ThunderIDAPIError` would no longer hold on
 * the client. Instead, the real error is mapped to a field/message here, server-side, while it
 * is still the genuine `ThunderIDAPIError` the core `updateMeCredentials` call threw, and only
 * the plain, serializable result crosses back.
 */
const updateUserCredentialsAction = async (
  payload: Record<string, string>,
  sessionId?: string,
): Promise<UpdateUserCredentialsActionResult> => {
  try {
    const client = getClient();
    await client.updateUserCredentials(payload, sessionId);
    return {field: null, messageKey: '', success: true};
  } catch (error) {
    const {field, message, messageKey}: CredentialUpdateErrorResult = mapCredentialUpdateError(error);
    return {field, message, messageKey, success: false};
  }
};

export default updateUserCredentialsAction;
