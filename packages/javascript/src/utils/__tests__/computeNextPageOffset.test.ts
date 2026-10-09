// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import computeNextPageOffset from '../computeNextPageOffset';

describe('computeNextPageOffset', () => {
  it('advances by the returned count', () => {
    expect(computeNextPageOffset(0, 30)).toBe(30);
    expect(computeNextPageOffset(30, 30, 75)).toBe(60);
  });

  it('stops when the page is empty', () => {
    expect(computeNextPageOffset(60, 0, 75)).toBeNull();
  });

  it('stops when the next offset reaches totalResults', () => {
    expect(computeNextPageOffset(60, 15, 75)).toBeNull();
  });

  it('continues when totalResults is unknown', () => {
    expect(computeNextPageOffset(60, 15)).toBe(75);
  });

  it('treats malformed input as exhausted', () => {
    expect(computeNextPageOffset(-1, 30)).toBeNull();
    expect(computeNextPageOffset(0, -1)).toBeNull();
    expect(computeNextPageOffset(1.5, 30)).toBeNull();
  });
});
