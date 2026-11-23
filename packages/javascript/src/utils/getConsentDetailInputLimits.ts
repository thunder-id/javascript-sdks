// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ConsentDetailRow} from '../models/embedded-flow';

/**
 * Inclusive limits a `number` or `date` authorization detail field keeps: the value that was shown, in the
 * direction the field may move, and the field's own minimum and maximum, whichever is tighter.
 */
export interface ConsentDetailInputLimits {
  /** Highest value the user may enter, if any. */
  max?: number | string;
  /** Lowest value the user may enter, if any. */
  min?: number | string;
}

/**
 * Gives the inclusive limits of a `number` or `date` authorization detail field.
 *
 * @param row - The field, carrying the shown value, its modification and its limits.
 * @returns The lowest and highest values the user may enter.
 *
 * @example
 * ```typescript
 * getConsentDetailInputLimits({label: 'Quantity', minimum: 5, modification: 'decrease', path: 'quantity', value: 20})
 * // returns {max: 20, min: 5}
 * ```
 */
const getConsentDetailInputLimits = (row: ConsentDetailRow): ConsentDetailInputLimits => {
  const isNumber: boolean = typeof row.value === 'number';
  const ofKind = (limit: unknown): number | string | undefined =>
    (isNumber ? typeof limit === 'number' : typeof limit === 'string') ? (limit as number | string) : undefined;
  const tighter = (
    a: number | string | undefined,
    b: number | string | undefined,
    pick: 'lower' | 'higher',
  ): number | string | undefined => {
    if (a === undefined) return b;
    if (b === undefined) return a;
    return (pick === 'higher' ? a > b : a < b) ? a : b;
  };
  const shown: number | string | undefined = ofKind(row.value);

  return {
    max: tighter(ofKind(row.maximum), row.modification === 'decrease' ? shown : undefined, 'lower'),
    min: tighter(ofKind(row.minimum), row.modification === 'increase' ? shown : undefined, 'higher'),
  };
};

export default getConsentDetailInputLimits;
