// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The i18n key for a failed re-sign-in: a blocked popup, a sign-in with a different account (in a popup
 * or a sign-in flow), or any other failure.
 *
 * @param error - The value `reauthenticate` threw.
 * @returns The i18n key to show.
 * @example
 * ```typescript
 * setError(t(mapReauthenticationError(caughtError)));
 * ```
 */
const mapReauthenticationError = (error: unknown): string => {
  const code: unknown = (error as {code?: unknown} | undefined)?.code;

  if (code === 'BROWSER-REAUTHENTICATION-PB01') {
    return 'user.reauthentication.popup_blocked.error';
  }

  if (code === 'JS-AUTH_CORE-CRA-IV03' || code === 'BROWSER-REAUTHENTICATION-DU01') {
    return 'user.reauthentication.different_user.error';
  }

  return 'user.reauthentication.failed.error';
};

export default mapReauthenticationError;
