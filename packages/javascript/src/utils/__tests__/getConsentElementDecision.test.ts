// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {PromptElement} from '../../models/embedded-flow';
import getConsentElementDecision from '../getConsentElementDecision';

const detail: PromptElement = {
  detailType: 'payment_initiation',
  name: 'd-1',
  rows: [{as: 'number', label: 'Amount', modification: 'decrease', path: 'amount', value: 35}],
};
const inputs: Record<string, unknown> = {'__consent_modified__p1__d-1__amount': '20'};

describe('getConsentElementDecision', (): void => {
  it('should carry the modified values of an approved authorization detail', (): void => {
    expect(getConsentElementDecision('p1', detail, true, inputs)).toEqual({
      approved: true,
      modified: {amount: 20},
      name: 'd-1',
    });
  });

  it('should leave the modified values out of a declined detail', (): void => {
    expect(getConsentElementDecision('p1', detail, false, inputs)).toEqual({approved: false, name: 'd-1'});
  });

  it('should carry only the name and approval of any other element', (): void => {
    expect(getConsentElementDecision('p1', {name: 'email'}, true, inputs)).toEqual({approved: true, name: 'email'});
  });
});
