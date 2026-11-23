// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import isConsentDetailMultiple, {getConsentDetailLowestMultiple} from '../isConsentDetailMultiple';

describe('isConsentDetailMultiple', (): void => {
  it.each([
    [20, 5],
    [0.07, 0.01],
    [4000.5, 0.01],
    [1e-7, 1e-8],
  ])('should accept %s as a multiple of %s', (value: number, step: number): void => {
    expect(isConsentDetailMultiple(value, step)).toBe(true);
  });

  it.each([
    [19, 5],
    [0.075, 0.01],
  ])('should refuse %s as a multiple of %s', (value: number, step: number): void => {
    expect(isConsentDetailMultiple(value, step)).toBe(false);
  });
});

describe('getConsentDetailLowestMultiple', (): void => {
  it('should give the lowest multiple at or above an inclusive limit', (): void => {
    expect(getConsentDetailLowestMultiple(3, 5, false)).toBe(5);
    expect(getConsentDetailLowestMultiple(5, 5, false)).toBe(5);
  });

  it('should give the lowest multiple above an exclusive limit', (): void => {
    expect(getConsentDetailLowestMultiple(0, 0.01, true)).toBe(0.01);
    expect(getConsentDetailLowestMultiple(5, 5, true)).toBe(10);
  });
});
