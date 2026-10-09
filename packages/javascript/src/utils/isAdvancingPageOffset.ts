// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Whether a loader's reported next offset is safe to follow: `null` (exhausted) or an integer past
 * the request offset. Anything else would loop or go backwards.
 */
const isAdvancingPageOffset = (requestOffset: number, nextOffset: number | null): nextOffset is number | null =>
  nextOffset === null || (Number.isInteger(nextOffset) && nextOffset > requestOffset);

export default isAdvancingPageOffset;
