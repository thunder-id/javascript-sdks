// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import isConsentDetailPlainList from '../isConsentDetailPlainList';

describe('isConsentDetailPlainList', (): void => {
  it('should tell a list of plain values from any other value', (): void => {
    expect(isConsentDetailPlainList(['a', 1, true])).toBe(true);
    expect(isConsentDetailPlainList([])).toBe(true);
    expect(isConsentDetailPlainList([{date: '2026-11-01'}])).toBe(false);
    expect(isConsentDetailPlainList('a')).toBe(false);
  });
});
