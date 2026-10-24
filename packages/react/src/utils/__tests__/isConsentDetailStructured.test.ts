// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import isConsentDetailStructured from '../isConsentDetailStructured';

describe('isConsentDetailStructured', (): void => {
  it('should tell structured JSON from plain values', (): void => {
    expect(isConsentDetailStructured({iban: 'DE02'})).toBe(true);
    expect(isConsentDetailStructured([{date: '2026-11-01'}])).toBe(true);
    expect(isConsentDetailStructured(['a', 'b'])).toBe(false);
    expect(isConsentDetailStructured(null)).toBe(false);
    expect(isConsentDetailStructured('text')).toBe(false);
  });
});
