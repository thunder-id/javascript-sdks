// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import isAdvancingPageOffset from '../isAdvancingPageOffset';

describe('isAdvancingPageOffset', () => {
  it('accepts null as the end of the list', () => {
    expect(isAdvancingPageOffset(30, null)).toBe(true);
  });

  it('accepts an integer past the request offset', () => {
    expect(isAdvancingPageOffset(30, 60)).toBe(true);
  });

  it('rejects an offset that would loop, go backwards, or is not an integer', () => {
    expect(isAdvancingPageOffset(30, 30)).toBe(false);
    expect(isAdvancingPageOffset(30, 10)).toBe(false);
    expect(isAdvancingPageOffset(30, 30.5)).toBe(false);
  });
});
