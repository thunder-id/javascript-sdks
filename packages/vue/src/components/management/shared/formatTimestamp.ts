// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Formats an ISO timestamp for display in the user's locale, leaving it as it is when it cannot be read.
 *
 * @param value - The timestamp.
 * @returns The formatted timestamp, or `undefined` when there is none.
 */
const formatTimestamp = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date: Date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default formatTimestamp;
