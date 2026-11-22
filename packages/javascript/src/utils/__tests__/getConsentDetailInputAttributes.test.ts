// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import type {ConsentDetailRow} from '../../models/embedded-flow';
import getConsentDetailInputAttributes from '../getConsentDetailInputAttributes';

const quantity: ConsentDetailRow = {
  label: 'Quantity',
  minimum: 3,
  modification: 'decrease',
  multipleOf: 5,
  path: 'quantity',
  value: 20,
};

describe('getConsentDetailInputAttributes', (): void => {
  it('should start the step at the lowest multiple the field accepts', (): void => {
    expect(getConsentDetailInputAttributes(quantity)).toEqual({max: '20', min: '5', step: '5'});
  });

  it('should step from the lowest multiple above an exclusive minimum', (): void => {
    expect(getConsentDetailInputAttributes({...quantity, exclusiveMinimum: 5, minimum: undefined}).min).toBe('10');
    expect(
      getConsentDetailInputAttributes({...quantity, exclusiveMinimum: 0, minimum: undefined, multipleOf: 0.01}),
    ).toEqual({max: '20', min: '0.01', step: '0.01'});
  });

  it('should leave a number without a step or limits unbounded', (): void => {
    expect(
      getConsentDetailInputAttributes({label: 'Amount', modification: 'decrease', path: 'amount', value: 35}),
    ).toEqual({max: '35', min: undefined, step: undefined});
  });

  it('should give a date no step', (): void => {
    expect(
      getConsentDetailInputAttributes({
        as: 'date',
        label: 'To',
        modification: 'decrease',
        path: 'to',
        value: '2026-09-30',
      }),
    ).toEqual({max: '2026-09-30', min: undefined, step: undefined});
  });
});
