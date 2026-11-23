// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import type {ConsentDetailRow} from '../../models/embedded-flow';
import getConsentDetailInputError from '../getConsentDetailInputError';

const quantity: ConsentDetailRow = {
  label: 'Quantity',
  minimum: 3,
  modification: 'decrease',
  multipleOf: 5,
  path: 'quantity',
  value: 20,
};
const total: ConsentDetailRow = {
  exclusiveMaximum: 5000,
  exclusiveMinimum: 0,
  label: 'Total',
  modification: 'increase',
  multipleOf: 0.01,
  path: 'total',
  value: 10,
};
const to: ConsentDetailRow = {as: 'date', label: 'To', modification: 'decrease', path: 'to', value: '2026-09-30'};

const errorOf = (row: ConsentDetailRow, text: string): [string, string] | undefined => {
  const error = getConsentDetailInputError(row, text);
  return error && [error.key.replace('consent.authorization_details.', ''), error.params['value']];
};

describe('getConsentDetailInputError', (): void => {
  it('should accept a number within its limits and on its step', (): void => {
    expect(errorOf(quantity, '15')).toBeUndefined();
    expect(errorOf(total, '10.07')).toBeUndefined();
    expect(errorOf({...total, modification: 'decrease'}, '0.07')).toBeUndefined();
  });

  it.each([
    ['', 'invalid_number', '20'],
    ['abc', 'invalid_number', '20'],
    ['25', 'number_max', '20'],
    ['2', 'number_min', '3'],
    ['19', 'number_multiple', '5'],
  ])('should refuse %j for a decreasing number', (text: string, key: string, value: string): void => {
    expect(errorOf(quantity, text)).toEqual([key, value]);
  });

  it('should refuse a number at an exclusive limit', (): void => {
    expect(errorOf({...total, modification: 'decrease', value: 6000}, '5000')).toEqual(['number_below', '5000']);
    expect(errorOf({...total, modification: 'decrease'}, '0')).toEqual(['number_above', '0']);
  });

  it('should check a date against its form and the value shown', (): void => {
    expect(errorOf(to, '2026-08-01')).toBeUndefined();
    expect(errorOf(to, '2026-10-01')).toEqual(['date_max', '2026-09-30']);
    expect(errorOf(to, '2026-13-01')).toEqual(['invalid_date', '2026-09-30']);
    expect(errorOf({...to, minimum: '2026-06-01'}, '2026-05-01')).toEqual(['date_min', '2026-06-01']);
  });
});
