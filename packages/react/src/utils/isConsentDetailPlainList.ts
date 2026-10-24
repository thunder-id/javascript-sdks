// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Whether a field value is a list of plain values, strings, numbers or booleans, which a consent screen shows
 * as a list rather than as structured JSON.
 *
 * @param value - Field value.
 * @returns `true` when the value is a list of plain values.
 *
 * @example
 * ```typescript
 * isConsentDetailPlainList(['initiate', 'status']) // returns true
 * ```
 */
const isConsentDetailPlainList = (value: unknown): value is (string | number | boolean)[] =>
  Array.isArray(value) && value.every((item: unknown) => ['string', 'number', 'boolean'].includes(typeof item));

export default isConsentDetailPlainList;
