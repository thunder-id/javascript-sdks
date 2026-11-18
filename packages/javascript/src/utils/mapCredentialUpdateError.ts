// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../errors/ThunderIDAPIError';
import ThunderIDError from '../errors/ThunderIDError';

/**
 * The form field a credential-update failure belongs to, or `null` when the failure has
 * no single field to blame and belongs at form level.
 */
export type CredentialUpdateErrorField = 'currentPassword' | 'newPassword' | null;

/**
 * Where a credential-update failure should be shown, and what it should say.
 *
 * `messageKey` is always set, so the caller can resolve text with a plain
 * `message ?? t(messageKey)` and never needs a non-null assertion. `message` is present
 * only when the server supplied something human-readable, and takes precedence when it
 * is. Translation is left to the caller, which keeps this module free of i18n concerns
 * in the same way {@link evaluatePasswordPolicy} is.
 */
export interface CredentialUpdateErrorResult {
  /**
   * The field to attach the error to, or `null` for a form-level error.
   */
  field: CredentialUpdateErrorField;
  /**
   * A server-supplied message, already human-readable. Shown as-is when present.
   */
  message?: string;
  /**
   * The i18n key to fall back to when `message` is absent. Always set.
   */
  messageKey: string;
}

/**
 * Maps a failure from the credential write path onto the field that caused it.
 *
 * A `403` for a missing or wrong current value belongs to the current-value field. A `400` is
 * the new value failing a server-side check, unless the server refused to set a credential the
 * user doesn't hold yet, which has no single field to blame. Everything else is form level.
 *
 * @param error - The value thrown by the credential update call.
 * @returns Where to show the failure and what to show.
 * @example
 * ```typescript
 * const {field, message, messageKey} = mapCredentialUpdateError(caughtError);
 * const text = message ?? t(messageKey);
 *
 * if (field) {
 *   setFieldErrors({[field]: text});
 * } else {
 *   setError(text);
 * }
 * ```
 */
const GENERIC_MESSAGE_KEY = 'user.change_password.generic.error';
const CURRENT_VALUE_MESSAGE_KEY = 'user.change_password.current.error';

/**
 * The server's code for a current value that is missing or doesn't match.
 */
const INVALID_CURRENT_CREDENTIAL_CODE = 'USR-1047';
/**
 * The server's code for a credential the user doesn't hold yet, refused because they hold another.
 */
const CREDENTIAL_SET_NOT_ALLOWED_CODE = 'USR-1048';

const mapCredentialUpdateError = (error: unknown): CredentialUpdateErrorResult => {
  const status: number | undefined = error instanceof ThunderIDAPIError ? error.statusCode : undefined;
  const serverCode: string | undefined = error instanceof ThunderIDAPIError ? error.serverError?.code : undefined;

  if (status === 403 && serverCode === INVALID_CURRENT_CREDENTIAL_CODE) {
    return {field: 'currentPassword', messageKey: CURRENT_VALUE_MESSAGE_KEY};
  }

  if (status === 400 && serverCode !== CREDENTIAL_SET_NOT_ALLOWED_CODE && error instanceof ThunderIDError) {
    return {field: 'newPassword', message: error.message, messageKey: GENERIC_MESSAGE_KEY};
  }

  if (error instanceof ThunderIDError) {
    return {field: null, message: error.message, messageKey: GENERIC_MESSAGE_KEY};
  }

  return {field: null, messageKey: GENERIC_MESSAGE_KEY};
};

export default mapCredentialUpdateError;
