// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Offset of the next page: the request offset plus the number of items the backend returned, or
 * `null` once the list is exhausted.
 */
const computeNextPageOffset = (offset: number, count: number, totalResults?: number): number | null => {
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(count) || count <= 0) {
    return null;
  }

  const next: number = offset + count;

  return totalResults !== undefined && next >= totalResults ? null : next;
};

export default computeNextPageOffset;
