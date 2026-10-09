// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import toPagedSelectOptions from '../toPagedSelectOptions';

describe('toPagedSelectOptions', () => {
  it('converts a plain list', () => {
    expect(toPagedSelectOptions(['a', 'b'])).toEqual([
      {label: 'a', value: 'a'},
      {label: 'b', value: 'b'},
    ]);
  });

  it('leaves out items with nothing to submit', () => {
    expect(toPagedSelectOptions(['a', '', 'b'])).toHaveLength(2);
  });

  it('applies the mapping to every object', () => {
    const items = [
      {code: 'x', title: 'X'},
      {code: 'y', title: 'Y'},
    ];

    expect(toPagedSelectOptions(items, {labelAttributes: ['title'], valueAttribute: 'code'})).toEqual([
      {label: 'X', value: 'x'},
      {label: 'Y', value: 'y'},
    ]);
  });
});
