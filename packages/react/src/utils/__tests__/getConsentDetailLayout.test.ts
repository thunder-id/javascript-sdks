// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentDetailLayout from '../getConsentDetailLayout';

describe('getConsentDetailLayout', (): void => {
  it('should keep a short field beside its label', (): void => {
    expect(getConsentDetailLayout({label: 'Pay to', path: 'creditorName', value: 'Merchant A'})).toBe('inline');
    expect(getConsentDetailLayout({label: 'Amount', modification: 'decrease', path: 'amount', value: 35})).toBe(
      'inline',
    );
    expect(getConsentDetailLayout({label: 'Actions', path: 'actions', value: ['initiate', 'status']})).toBe('inline');
  });

  it('should stack a field with a long label or a long value', (): void => {
    expect(
      getConsentDetailLayout({label: 'Beneficiary bank correspondent routing reference', path: 'ref', value: 'R'}),
    ).toBe('stacked');
    expect(
      getConsentDetailLayout({label: 'Account', path: 'iban', value: 'DE89370400440532013000DE893704004405'}),
    ).toBe('stacked');
  });

  it('should stack a long list and count the values a list offers to add', (): void => {
    expect(
      getConsentDetailLayout({
        label: 'Regions',
        path: 'regions',
        value: ['Region-01', 'Region-02', 'Region-03', 'Region-04'],
      }),
    ).toBe('stacked');
    expect(
      getConsentDetailLayout({
        label: 'Excluded',
        modification: 'addItems',
        options: ['casino', 'crypto', 'lottery', 'betting', 'forex'],
        path: 'excluded',
        value: ['casino'],
      }),
    ).toBe('stacked');
  });

  it('should stack structured JSON', (): void => {
    expect(getConsentDetailLayout({label: 'Account', path: 'account', value: {iban: 'DE02'}})).toBe('stacked');
  });
});
