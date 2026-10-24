// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Formats an authorization detail field value for display. Strings are shown as-is, a list of
 * plain values comma-separated, and any other JSON value as JSON, compact unless `indent` is given.
 *
 * @param value - Field value.
 * @param indent - Spaces to indent structured JSON by, so it reads as a block rather than one long line.
 * @returns Display text.
 *
 * @example
 * ```typescript
 * formatConsentDetailValue(['initiate', 'status']) // returns 'initiate, status'
 * ```
 */
const formatConsentDetailValue = (value: unknown, indent?: number): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((item: unknown) => typeof item !== 'object' || item === null)) {
    return value.map((item: unknown) => String(item)).join(', ');
  }
  return JSON.stringify(value, null, indent);
};

export default formatConsentDetailValue;
