// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Whether authorization detail text is long enough to be clamped behind a toggle: longer than `maxChars`, or
 * spanning more than `maxLines` lines.
 *
 * @param text - Text to show.
 * @param maxChars - Number of characters above which the text is clamped, such as
 * `CONSENT_DETAIL_DISPLAY_LIMITS.valueChars`.
 * @param maxLines - Number of lines above which the text is clamped, such as
 * `CONSENT_DETAIL_DISPLAY_LIMITS.valueLines`.
 * @returns `true` when the text is clamped while collapsed.
 *
 * @example
 * ```typescript
 * isConsentDetailTextClamped('Merchant A', CONSENT_DETAIL_DISPLAY_LIMITS.valueChars, CONSENT_DETAIL_DISPLAY_LIMITS.valueLines)
 * // returns false
 * ```
 */
const isConsentDetailTextClamped = (text: string, maxChars: number, maxLines: number): boolean =>
  text.length > maxChars || text.split('\n').length > maxLines;

export default isConsentDetailTextClamped;
