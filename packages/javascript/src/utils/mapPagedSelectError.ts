// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDError from '../errors/ThunderIDError';

/**
 * Where a failed page load should get its display text from.
 *
 * `messageKey` is always set, so the caller can resolve text with a plain
 * `message ?? t(messageKey)` and never needs a non-null assertion. `message` is present
 * only when the loader threw a {@link ThunderIDError}, and takes precedence when it is.
 * Translation is left to the caller, which keeps this module free of i18n concerns in the
 * same way {@link mapCredentialUpdateError} is.
 */
export interface PagedSelectErrorResult {
  /**
   * The failed loader's own message, already human-readable. Shown as-is when present.
   */
  message?: string;
  /**
   * The i18n key to fall back to when `message` is absent. Always set.
   */
  messageKey: string;
}

const GENERIC_MESSAGE_KEY = 'elements.fields.paged_select.load_error';

/**
 * Maps a `fetchOptions`/`fetchUsers` loader failure onto what a picker should show.
 *
 * `fetchOptions` is consumer-supplied, so a thrown value is not guaranteed to be a
 * {@link ThunderIDError} the way a core API call's failure is. Only a {@link ThunderIDError}'s
 * message is trusted for direct display; anything else — a bare `Error`, a rejected string, an
 * upstream exception with an unreviewed message — falls back to the generic, translatable one.
 *
 * @param error - The value thrown by the page loader.
 * @returns Where to show the failure and what to show.
 * @example
 * ```typescript
 * const {message, messageKey} = mapPagedSelectError(caughtError);
 * const text = message ?? t(messageKey);
 * ```
 */
const mapPagedSelectError = (error: unknown): PagedSelectErrorResult =>
  error instanceof ThunderIDError
    ? {message: error.message, messageKey: GENERIC_MESSAGE_KEY}
    : {messageKey: GENERIC_MESSAGE_KEY};

export default mapPagedSelectError;
