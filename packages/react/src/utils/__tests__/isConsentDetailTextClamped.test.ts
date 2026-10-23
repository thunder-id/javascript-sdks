// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import isConsentDetailTextClamped from '../isConsentDetailTextClamped';

describe('isConsentDetailTextClamped', (): void => {
  it('should clamp text longer than its character or line limit', (): void => {
    expect(isConsentDetailTextClamped('abcd', 4, 1)).toBe(false);
    expect(isConsentDetailTextClamped('abcde', 4, 1)).toBe(true);
    expect(isConsentDetailTextClamped('a\nb', 10, 1)).toBe(true);
    expect(isConsentDetailTextClamped('a\nb', 10, 2)).toBe(false);
  });
});
