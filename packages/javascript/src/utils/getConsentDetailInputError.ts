// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import getConsentDetailInputLimits, {type ConsentDetailInputLimits} from './getConsentDetailInputLimits';
import isConsentDetailMultiple from './isConsentDetailMultiple';
import type {ConsentDetailRow} from '../models/embedded-flow';

/**
 * Error shown for text a user entered into an authorization detail field, as a translation key and the
 * values to substitute into its text.
 *
 * @experimental This interface may change in future versions
 */
export interface ConsentDetailInputError {
  /** Translation key of the message. */
  key: string;
  /** Values to substitute into the message: `value` is the value that was shown. */
  params: Record<string, string>;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks the text a user entered for an authorization detail field that may be decreased or increased: a
 * number, or a date in `YYYY-MM-DD` form. The text must be a value of the field's kind, stay within the
 * value that was shown in the direction the field may move, and keep the field's limits: its minimum and
 * maximum and, for a number, its exclusive limits and the step it must be a multiple of.
 *
 * @param row - The field, carrying the shown value, its modification and its limits.
 * @param text - The text the user entered.
 * @returns The error to show, or `undefined` when the text may be submitted.
 *
 * @example
 * ```typescript
 * getConsentDetailInputError({label: 'Amount', modification: 'decrease', path: 'amount', value: 35}, '50')
 * // returns {key: 'consent.authorization_details.number_max', params: {value: '35'}}
 * getConsentDetailInputError({label: 'Quantity', modification: 'decrease', multipleOf: 5, path: 'quantity', value: 20}, '19')
 * // returns {key: 'consent.authorization_details.number_multiple', params: {value: '5'}}
 * ```
 */
const getConsentDetailInputError = (row: ConsentDetailRow, text: string): ConsentDetailInputError | undefined => {
  const {max, min}: ConsentDetailInputLimits = getConsentDetailInputLimits(row);
  const error = (key: string, value: unknown): ConsentDetailInputError => ({
    key: `consent.authorization_details.${key}`,
    params: {value: String(value)},
  });

  if (typeof row.value === 'number') {
    const entered = Number(text);
    if (text.trim() === '' || !Number.isFinite(entered)) return error('invalid_number', row.value);
    if (max !== undefined && entered > (max as number)) return error('number_max', max);
    if (min !== undefined && entered < (min as number)) return error('number_min', min);
    if (row.exclusiveMaximum !== undefined && entered >= row.exclusiveMaximum) {
      return error('number_below', row.exclusiveMaximum);
    }
    if (row.exclusiveMinimum !== undefined && entered <= row.exclusiveMinimum) {
      return error('number_above', row.exclusiveMinimum);
    }
    if (row.multipleOf !== undefined && !isConsentDetailMultiple(entered, row.multipleOf)) {
      return error('number_multiple', row.multipleOf);
    }

    return undefined;
  }

  if (!DATE_PATTERN.test(text) || Number.isNaN(Date.parse(text))) return error('invalid_date', row.value);
  if (max !== undefined && text > max) return error('date_max', max);
  if (min !== undefined && text < min) return error('date_min', min);

  return undefined;
};

export default getConsentDetailInputError;
