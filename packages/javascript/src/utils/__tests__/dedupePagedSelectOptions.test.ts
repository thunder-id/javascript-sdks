// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import type {PagedSelectOption} from '../../models/paged-select';
import dedupePagedSelectOptions from '../dedupePagedSelectOptions';

describe('dedupePagedSelectOptions', () => {
  it('appends new options after existing ones', () => {
    const existing: PagedSelectOption[] = [{label: 'Alice', value: 'user-1'}];
    const incoming: PagedSelectOption[] = [{label: 'Bob', value: 'user-2'}];

    expect(dedupePagedSelectOptions(existing, incoming)).toEqual([
      {label: 'Alice', value: 'user-1'},
      {label: 'Bob', value: 'user-2'},
    ]);
  });

  it('keeps a repeated value at its first position with the newest data', () => {
    const existing: PagedSelectOption[] = [
      {label: 'Alice', value: 'user-1'},
      {label: 'Bob', value: 'user-2'},
    ];
    const incoming: PagedSelectOption[] = [
      {label: 'Bob (updated)', value: 'user-2'},
      {label: 'Carol', value: 'user-3'},
    ];

    expect(dedupePagedSelectOptions(existing, incoming)).toEqual([
      {label: 'Alice', value: 'user-1'},
      {label: 'Bob (updated)', value: 'user-2'},
      {label: 'Carol', value: 'user-3'},
    ]);
  });

  it('removes repeats within a single page', () => {
    expect(
      dedupePagedSelectOptions(
        [],
        [
          {label: 'A', value: 'a'},
          {label: 'A again', value: 'a'},
        ],
      ),
    ).toEqual([{label: 'A again', value: 'a'}]);
  });
});
