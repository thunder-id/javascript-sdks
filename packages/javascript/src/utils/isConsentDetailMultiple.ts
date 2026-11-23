// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Counts the decimal places of a number, including those its exponent adds.
 *
 * @param value - The number.
 * @returns The number of decimal places.
 */
const getDecimalPlaces = (value: number): number => {
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  return Math.max(0, (mantissa.split('.')[1]?.length ?? 0) - Number(exponent));
};

/**
 * Gives the scale that turns two numbers into whole numbers, so they can be compared without the rounding
 * of binary fractions, which would refuse 0.07 as a multiple of 0.01.
 *
 * @param a - One number.
 * @param b - The other number.
 * @returns A power of ten.
 */
const getCommonScale = (a: number, b: number): number => 10 ** Math.max(getDecimalPlaces(a), getDecimalPlaces(b));

/**
 * Gives the lowest multiple of a step above a limit, or at it when the limit is inclusive. A number input
 * steps from its lower limit, so this keeps its arrows on the field's multiples.
 *
 * @param limit - The lower limit.
 * @param step - The step.
 * @param exclusive - Whether the limit itself is excluded.
 * @returns The lowest multiple the field accepts.
 *
 * @example
 * ```typescript
 * getConsentDetailLowestMultiple(3, 5, false) // returns 5
 * getConsentDetailLowestMultiple(0, 0.01, true) // returns 0.01
 * ```
 */
export const getConsentDetailLowestMultiple = (limit: number, step: number, exclusive: boolean): number => {
  const scale: number = getCommonScale(limit, step);
  const scaledLimit: number = Math.round(limit * scale);
  const scaledStep: number = Math.round(step * scale);
  let count: number = Math.ceil(scaledLimit / scaledStep);
  if (exclusive && count * scaledStep === scaledLimit) count += 1;
  return (count * scaledStep) / scale;
};

/**
 * Reports whether a number is a multiple of a step.
 *
 * @param value - The number.
 * @param step - The step.
 * @returns Whether the number is a whole multiple of the step.
 *
 * @example
 * ```typescript
 * isConsentDetailMultiple(0.07, 0.01) // returns true
 * isConsentDetailMultiple(19, 5) // returns false
 * ```
 */
const isConsentDetailMultiple = (value: number, step: number): boolean => {
  const scale: number = getCommonScale(value, step);
  const scaledStep: number = Math.round(step * scale);
  return scaledStep === 0 || Math.round(value * scale) % scaledStep === 0;
};

export default isConsentDetailMultiple;
