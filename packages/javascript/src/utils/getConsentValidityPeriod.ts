// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Form key holding the number of seconds the user chose their consent to last.
 */
export const CONSENT_VALIDITY_PERIOD_KEY = '__consent_validity_period__';

/**
 * Reads the validity period the user chose from the form values.
 *
 * @param inputs - Form values, holding the chosen period under the consent validity period key.
 * @returns The chosen number of seconds, or `undefined` when the user chose none or the value is not a number.
 *
 * @example
 * ```typescript
 * getConsentValidityPeriod({'__consent_validity_period__': '3600'}) // returns 3600
 * ```
 */
const getConsentValidityPeriod = (inputs: Record<string, unknown>): number | undefined => {
  const value: unknown = inputs[CONSENT_VALIDITY_PERIOD_KEY];
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const text: string = String(value).trim();
  if (text === '') {
    return undefined;
  }

  const seconds = Number(text);
  return Number.isFinite(seconds) ? seconds : undefined;
};

export default getConsentValidityPeriod;
