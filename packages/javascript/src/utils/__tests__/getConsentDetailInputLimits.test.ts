// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import type {ConsentDetailRow} from '../../models/embedded-flow';
import getConsentDetailInputLimits from '../getConsentDetailInputLimits';

const quantity: ConsentDetailRow = {label: 'Quantity', modification: 'decrease', path: 'quantity', value: 20};

describe('getConsentDetailInputLimits', (): void => {
  it('should cap a decreasing number at the value shown and keep its minimum', (): void => {
    expect(getConsentDetailInputLimits({...quantity, minimum: 5})).toEqual({max: 20, min: 5});
  });

  it('should take the tighter of the value shown and the maximum', (): void => {
    expect(getConsentDetailInputLimits({...quantity, maximum: 10})).toEqual({max: 10, min: undefined});
    expect(getConsentDetailInputLimits({...quantity, maximum: 50})).toEqual({max: 20, min: undefined});
  });

  it('should floor an increasing number at the value shown', (): void => {
    expect(getConsentDetailInputLimits({...quantity, maximum: 50, modification: 'increase'})).toEqual({
      max: 50,
      min: 20,
    });
  });

  it('should bound a date by the value shown and ignore limits of another kind', (): void => {
    const to: ConsentDetailRow = {as: 'date', label: 'To', modification: 'decrease', path: 'to', value: '2026-09-30'};
    expect(getConsentDetailInputLimits({...to, maximum: 5, minimum: '2026-01-01'})).toEqual({
      max: '2026-09-30',
      min: '2026-01-01',
    });
  });
});
