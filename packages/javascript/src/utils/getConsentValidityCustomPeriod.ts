// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CONSENT_VALIDITY_UNIT_SECONDS,
  type ConsentValidityUnit,
  getConsentValidityLimit,
  isConsentValidityUnlimited,
} from './getConsentValidityOptions';

/**
 * A period the user typed, as the number shown in the field and the seconds to submit.
 */
export interface ConsentValidityCustomPeriod {
  /** The number to show in the field. Empty when the text is not a whole number from one. */
  amount: string;
  /** The period in seconds, held at the limit. Empty when the text is not a whole number from one. */
  seconds: string;
}

const CUSTOM_UNITS: readonly ConsentValidityUnit[] = ['second', 'minute', 'hour', 'day'];

/**
 * Lists the units a user can type a period in: those that are not longer than the limit, shortest first.
 *
 * @param maxValidityPeriod - The longest validity period in seconds. Absent when there is no limit.
 * @returns The units. Seconds are always among them.
 *
 * @example
 * ```typescript
 * getConsentValidityCustomUnits(7200) // returns ['second', 'minute', 'hour']
 * ```
 */
export const getConsentValidityCustomUnits = (maxValidityPeriod?: number): ConsentValidityUnit[] => {
  const limit: number = getConsentValidityLimit(maxValidityPeriod);

  return CUSTOM_UNITS.filter((unit: ConsentValidityUnit): boolean => CONSENT_VALIDITY_UNIT_SECONDS[unit] <= limit);
};

const unitSeconds = (unit: ConsentValidityUnit, limit: number): number =>
  CONSENT_VALIDITY_UNIT_SECONDS[unit] <= limit ? CONSENT_VALIDITY_UNIT_SECONDS[unit] : 1;

/**
 * Works out the largest number of a unit the user can type.
 *
 * @param maxValidityPeriod - The longest validity period in seconds. Absent when there is no limit.
 * @param unit - The unit the number is in.
 * @returns The largest whole number of the unit that fits the limit. Absent when there is no limit.
 *
 * @example
 * ```typescript
 * getConsentValidityCustomMax(10000, 'minute') // returns 166
 * ```
 */
export const getConsentValidityCustomMax = (
  maxValidityPeriod: number | undefined,
  unit: ConsentValidityUnit,
): number | undefined => {
  if (isConsentValidityUnlimited(maxValidityPeriod)) {
    return undefined;
  }
  const limit: number = getConsentValidityLimit(maxValidityPeriod);

  return Math.floor(limit / unitSeconds(unit, limit));
};

/**
 * Splits a period in seconds into the largest unit that holds it as a whole number.
 *
 * @param seconds - The period in seconds.
 * @param units - The units to choose from, which must include seconds.
 * @returns The number as text and its unit.
 *
 * @example
 * ```typescript
 * splitConsentValidityPeriod(7200, ['second', 'minute', 'hour']) // returns {amount: '2', unit: 'hour'}
 * ```
 */
export const splitConsentValidityPeriod = (
  seconds: number,
  units: readonly ConsentValidityUnit[],
): {amount: string; unit: ConsentValidityUnit} => {
  const unit: ConsentValidityUnit =
    [...units]
      .reverse()
      .find((candidate: ConsentValidityUnit): boolean => seconds % CONSENT_VALIDITY_UNIT_SECONDS[candidate] === 0) ??
    'second';

  return {amount: String(seconds / CONSENT_VALIDITY_UNIT_SECONDS[unit]), unit};
};

/**
 * Reads the number the user typed as a period in a unit, and holds it at the limit.
 *
 * @param text - The text typed in the custom validity field.
 * @param maxValidityPeriod - The longest validity period in seconds. Absent when there is no limit.
 * @param unit - The unit the number is in. Seconds when absent.
 * @returns The number to show and the seconds to submit, both empty when the text is not a whole number from one. A
 * number above the limit becomes the most whole units that fit it.
 *
 * @example
 * ```typescript
 * getConsentValidityCustomPeriod('3', 86400, 'hour') // returns {amount: '3', seconds: '10800'}
 * getConsentValidityCustomPeriod('9', 3600, 'hour') // returns {amount: '1', seconds: '3600'}
 * ```
 */
const getConsentValidityCustomPeriod = (
  text: string,
  maxValidityPeriod?: number,
  unit: ConsentValidityUnit = 'second',
): ConsentValidityCustomPeriod => {
  const typed: string = text.trim();
  if (!/^\d+$/.test(typed) || Number(typed) < 1) {
    return {amount: '', seconds: ''};
  }

  const limit: number = getConsentValidityLimit(maxValidityPeriod);
  const size: number = unitSeconds(unit, limit);
  const amount = Number(typed);

  if (amount * size > limit) {
    const most: number = Math.floor(limit / size);

    return {amount: String(most), seconds: String(most * size)};
  }

  return {amount: String(amount), seconds: String(amount * size)};
};

export default getConsentValidityCustomPeriod;
