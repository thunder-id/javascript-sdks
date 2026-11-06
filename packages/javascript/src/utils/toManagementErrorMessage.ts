// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../errors/ThunderIDAPIError';

/**
 * Turns a failed management request into a message for admin UI. A missing permission and a
 * missing resource get their own messages; a refusal the caller names in `specificKeys` gets that
 * message; anything else gets the operation's fallback. The server's own error text is never shown.
 *
 * @param t - The translation function.
 * @param error - The error a management operation reported, if any.
 * @param fallbackKey - Translation key of the message for any other failure.
 * @param specificKeys - Translation keys for specific refusals, keyed by the server's error code
 * (such as `OU-1006`) or by HTTP status (such as `409`). A code wins over a status.
 * @returns The translated message, or `null` when there is no error.
 */
const toManagementErrorMessage = (
  t: (key: string) => string,
  error: Error | null | undefined,
  fallbackKey: string,
  specificKeys?: Readonly<Record<string, string>>,
): string | null => {
  if (!error) {
    return null;
  }

  if (error instanceof ThunderIDAPIError) {
    const byCode: string | undefined = error.serverError?.code ? specificKeys?.[error.serverError.code] : undefined;

    if (byCode) {
      return t(byCode);
    }

    if (error.statusCode === 403) {
      return t('admin.common.errors.forbidden');
    }

    if (error.statusCode === 404) {
      return t('admin.common.errors.not_found');
    }

    const byStatus: string | undefined =
      error.statusCode !== undefined ? specificKeys?.[String(error.statusCode)] : undefined;

    if (byStatus) {
      return t(byStatus);
    }
  }

  return t(fallbackKey);
};

export default toManagementErrorMessage;
