// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import mapReauthenticationError from './mapReauthenticationError';
import {RECENT_AUTHENTICATION_REQUIRED_CODE} from './parseAuthenticationChallenge';
import {REAUTHENTICATION_FAILED} from './runWithStepUp';
import StepUpRequiredError from '../errors/StepUpRequiredError';
import ThunderIDAPIError from '../errors/ThunderIDAPIError';
import ThunderIDError from '../errors/ThunderIDError';
import ThunderIDRuntimeError from '../errors/ThunderIDRuntimeError';
import {AuthenticationChallenge} from '../models/api';

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
 * only when the server supplied something human-readable and the SDK has no translated
 * text for the failure. Translation is left to the caller, which keeps this module free
 * of i18n concerns in the same way {@link evaluatePasswordPolicy} is.
 */
export interface CredentialUpdateErrorResult {
  /**
   * Set when the change needs a more recent sign-in (`AUTH-4011`). Sign the user in again
   * with its `maxAge` and retry.
   */
  authenticationChallenge?: AuthenticationChallenge;
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

const GENERIC_MESSAGE_KEY = 'user.change_password.generic.error';

/**
 * Server codes the SDK has its own translated text for.
 */
const KNOWN_FAILURES: Record<string, {field: CredentialUpdateErrorField; messageKey: string}> = {
  [RECENT_AUTHENTICATION_REQUIRED_CODE]: {field: null, messageKey: 'user.change_password.reauthentication.error'},
  'USR-1047': {field: 'currentPassword', messageKey: 'user.change_password.current.required.error'},
  'USR-1048': {field: 'currentPassword', messageKey: 'user.change_password.current.invalid.error'},
};

/**
 * Maps a failure from the credential write path onto the field that caused it.
 *
 * - `USR-1047` (current value missing) and `USR-1048` (current value does not match) belong
 *   to the current-value field.
 * - `AUTH-4011` (the change needs a more recent sign-in) is form-level and carries the
 *   challenge, so the caller can sign the user in again.
 * - A failed re-sign-in from {@link runWithStepUp} is form-level, with the text for why it failed.
 * - Any other `400` is the new value failing a server-side check.
 * - Everything else is form-level, with the server's message when it sent one.
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
const mapCredentialUpdateError = (error: unknown): CredentialUpdateErrorResult => {
  if (error instanceof ThunderIDRuntimeError && error.code === REAUTHENTICATION_FAILED) {
    return {
      field: null,
      messageKey: mapReauthenticationError((error.details as {cause?: unknown} | undefined)?.cause),
    };
  }

  const apiError: ThunderIDAPIError | undefined = error instanceof ThunderIDAPIError ? error : undefined;
  // A step-up error is known by its type too, for a challenge read from the header alone.
  const serverCode: string | undefined =
    error instanceof StepUpRequiredError ? RECENT_AUTHENTICATION_REQUIRED_CODE : apiError?.serverError?.code;
  const known: {field: CredentialUpdateErrorField; messageKey: string} | undefined =
    serverCode !== undefined ? KNOWN_FAILURES[serverCode] : undefined;

  if (known) {
    return {
      ...known,
      ...(apiError?.authenticationChallenge && {authenticationChallenge: apiError.authenticationChallenge}),
    };
  }

  if (apiError?.statusCode === 400) {
    return {field: 'newPassword', message: apiError.message, messageKey: GENERIC_MESSAGE_KEY};
  }

  if (error instanceof ThunderIDError) {
    return {field: null, message: error.message, messageKey: GENERIC_MESSAGE_KEY};
  }

  return {field: null, messageKey: GENERIC_MESSAGE_KEY};
};

export default mapCredentialUpdateError;
