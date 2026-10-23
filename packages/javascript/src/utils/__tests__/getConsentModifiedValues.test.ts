// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {PromptElement} from '../../models/embedded-flow';
import getConsentInvalidKey from '../getConsentInvalidKey';
import getConsentModifiedKey from '../getConsentModifiedKey';
import getConsentModifiedValues from '../getConsentModifiedValues';

const element: PromptElement = {
  detailType: 'payment_initiation',
  name: 'd-1',
  rows: [
    {as: 'number', label: 'Amount', modification: 'decrease', path: 'instructedAmount.amount', value: 35},
    {label: 'Actions', modification: 'removeItems', path: 'actions', value: ['initiate', 'status']},
    {label: 'Pay to', path: 'creditorName', value: 'Merchant A'},
  ],
};

describe('getConsentModifiedKey', (): void => {
  it('should build a key from the purpose, the detail and the field path', (): void => {
    expect(getConsentModifiedKey('p1', 'd-1', 'instructedAmount.amount')).toBe(
      '__consent_modified__p1__d-1__instructedAmount.amount',
    );
  });
});

describe('getConsentInvalidKey', (): void => {
  it('should build a key from the purpose, the detail and the field path', (): void => {
    expect(getConsentInvalidKey('p1', 'd-1', 'instructedAmount.amount')).toBe(
      '__consent_invalid__p1__d-1__instructedAmount.amount',
    );
  });
});

describe('getConsentModifiedValues', (): void => {
  it('should return the changed values keyed by field path', (): void => {
    const inputs: Record<string, unknown> = {
      [getConsentModifiedKey('p1', 'd-1', 'actions')]: '["initiate"]',
      [getConsentModifiedKey('p1', 'd-1', 'instructedAmount.amount')]: '20',
    };

    expect(getConsentModifiedValues('p1', element, inputs)).toEqual({
      actions: ['initiate'],
      'instructedAmount.amount': 20,
    });
  });

  it('should leave out a field kept at the value that was shown', (): void => {
    const inputs: Record<string, unknown> = {
      [getConsentModifiedKey('p1', 'd-1', 'actions')]: '["initiate","status"]',
      [getConsentModifiedKey('p1', 'd-1', 'instructedAmount.amount')]: '35',
    };

    expect(getConsentModifiedValues('p1', element, inputs)).toBeUndefined();
  });

  it('should ignore a field that is not modification', (): void => {
    const inputs: Record<string, unknown> = {[getConsentModifiedKey('p1', 'd-1', 'creditorName')]: '"Merchant B"'};

    expect(getConsentModifiedValues('p1', element, inputs)).toBeUndefined();
  });

  it('should ignore values that are empty or not JSON', (): void => {
    const inputs: Record<string, unknown> = {
      [getConsentModifiedKey('p1', 'd-1', 'actions')]: 'not json',
      [getConsentModifiedKey('p1', 'd-1', 'instructedAmount.amount')]: '',
    };

    expect(getConsentModifiedValues('p1', element, inputs)).toBeUndefined();
  });

  it('should ignore a field marked as holding text that cannot be submitted', (): void => {
    const inputs: Record<string, unknown> = {
      [getConsentInvalidKey('p1', 'd-1', 'instructedAmount.amount')]: 'true',
      [getConsentModifiedKey('p1', 'd-1', 'actions')]: '["initiate"]',
      [getConsentModifiedKey('p1', 'd-1', 'instructedAmount.amount')]: '20',
    };

    expect(getConsentModifiedValues('p1', element, inputs)).toEqual({actions: ['initiate']});
  });

  it('should read a field whose invalid marker is cleared', (): void => {
    const inputs: Record<string, unknown> = {
      [getConsentInvalidKey('p1', 'd-1', 'instructedAmount.amount')]: '',
      [getConsentModifiedKey('p1', 'd-1', 'instructedAmount.amount')]: '20',
    };

    expect(getConsentModifiedValues('p1', element, inputs)).toEqual({'instructedAmount.amount': 20});
  });

  it('should return undefined for an element without rows', (): void => {
    expect(getConsentModifiedValues('p1', {name: 'email'}, {})).toBeUndefined();
  });
});
