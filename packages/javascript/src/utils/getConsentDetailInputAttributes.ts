// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import getConsentDetailInputLimits, {type ConsentDetailInputLimits} from './getConsentDetailInputLimits';
import {getConsentDetailLowestMultiple} from './isConsentDetailMultiple';
import type {ConsentDetailRow} from '../models/embedded-flow';

/**
 * The `min`, `max` and `step` attributes of the input of a `number` or `date` authorization detail field.
 */
export interface ConsentDetailInputAttributes {
  /** Highest value the input accepts, if any. */
  max?: string;
  /** Lowest value the input accepts, if any; with a step, the lowest multiple of the step. */
  min?: string;
  /** Step the input moves by, if any. */
  step?: string;
}

/**
 * Gives the `min`, `max` and `step` attributes of the input of a `number` or `date` authorization detail
 * field, so the browser's own controls stay within what the field accepts. A number input counts its steps
 * from `min`, so with a step `min` is the lowest multiple the field accepts.
 *
 * @param row - The field, carrying the shown value, its modification and its limits.
 * @returns The attributes, each absent when the field has no such limit.
 *
 * @example
 * ```typescript
 * getConsentDetailInputAttributes({label: 'Quantity', minimum: 3, modification: 'decrease', multipleOf: 5, path: 'quantity', value: 20})
 * // returns {max: '20', min: '5', step: '5'}
 * ```
 */
const getConsentDetailInputAttributes = (row: ConsentDetailRow): ConsentDetailInputAttributes => {
  const {max, min}: ConsentDetailInputLimits = getConsentDetailInputLimits(row);
  const step: number | undefined = typeof row.value === 'number' ? row.multipleOf : undefined;
  let lowest: number | string | undefined = min;

  if (step !== undefined) {
    if (typeof min === 'number' && (row.exclusiveMinimum === undefined || min > row.exclusiveMinimum)) {
      lowest = getConsentDetailLowestMultiple(min, step, false);
    } else if (row.exclusiveMinimum !== undefined) {
      lowest = getConsentDetailLowestMultiple(row.exclusiveMinimum, step, true);
    }
  }

  return {
    max: max === undefined ? undefined : String(max),
    min: lowest === undefined ? undefined : String(lowest),
    step: step === undefined ? undefined : String(step),
  };
};

export default getConsentDetailInputAttributes;
