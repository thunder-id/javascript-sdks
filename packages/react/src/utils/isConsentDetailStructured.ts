// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Whether a field value is structured JSON, an object or a list holding objects, rather than a plain
 * value or a list of plain values.
 *
 * @param value - Field value.
 * @returns `true` when the value is shown as a formatted JSON block.
 */
const isConsentDetailStructured = (value: unknown): boolean =>
  (typeof value === 'object' && value !== null && !Array.isArray(value)) ||
  (Array.isArray(value) && value.some((item: unknown) => typeof item === 'object' && item !== null));

export default isConsentDetailStructured;
