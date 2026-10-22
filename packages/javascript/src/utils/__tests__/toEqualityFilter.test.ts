// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import toEqualityFilter from '../toEqualityFilter';

describe('toEqualityFilter', () => {
  it('builds an eq expression from a trimmed value', () => {
    expect(toEqualityFilter('username', '  ada ')).toBe('username eq "ada"');
    expect(toEqualityFilter('address.city', 'Mountain View')).toBe('address.city eq "Mountain View"');
  });

  it('drops double quotes, which the expression cannot carry', () => {
    expect(toEqualityFilter('name', 'Say "hi"')).toBe('name eq "Say hi"');
  });

  it('returns undefined for a blank value or an invalid attribute', () => {
    expect(toEqualityFilter('username', '   ')).toBeUndefined();
    expect(toEqualityFilter('username', undefined)).toBeUndefined();
    expect(toEqualityFilter('user name', 'ada')).toBeUndefined();
    expect(toEqualityFilter('username) or (1', 'ada')).toBeUndefined();
  });
});
