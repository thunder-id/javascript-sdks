// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import formatConsentDetailValue from '../formatConsentDetailValue';

describe('formatConsentDetailValue', (): void => {
  it('should format plain values and lists', (): void => {
    expect(formatConsentDetailValue('Merchant A')).toBe('Merchant A');
    expect(formatConsentDetailValue(['initiate', 'status'])).toBe('initiate, status');
    expect(formatConsentDetailValue(null)).toBe('');
  });

  it('should format structured JSON compactly unless an indent is given', (): void => {
    expect(formatConsentDetailValue({iban: 'DE02'})).toBe('{"iban":"DE02"}');
    expect(formatConsentDetailValue({iban: 'DE02'}, 2)).toBe('{\n  "iban": "DE02"\n}');
  });
});
