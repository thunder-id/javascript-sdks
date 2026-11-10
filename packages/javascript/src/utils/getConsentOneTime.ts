// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Form key set to `'true'` when the user chose not to remember their decision.
 */
export const CONSENT_ONE_TIME_KEY = '__consent_one_time__';

/**
 * Reads whether the user chose not to remember their decision from the form values. A period of one second typed by
 * the user is a period like any other, so only this choice marks a decision as not remembered.
 *
 * @param inputs - Form values, holding the choice under the consent one-time key.
 * @returns `true` when the user chose not to remember the decision.
 *
 * @example
 * ```typescript
 * getConsentOneTime({'__consent_one_time__': 'true'}) // returns true
 * ```
 */
const getConsentOneTime = (inputs: Record<string, unknown>): boolean => inputs[CONSENT_ONE_TIME_KEY] === 'true';

export default getConsentOneTime;
