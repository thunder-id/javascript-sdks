// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentValidityPeriod, {CONSENT_VALIDITY_PERIOD_KEY} from '../getConsentValidityPeriod';

describe('getConsentValidityPeriod', (): void => {
  it('should read the chosen period as a number', (): void => {
    expect(getConsentValidityPeriod({[CONSENT_VALIDITY_PERIOD_KEY]: '3600'})).toBe(3600);
  });

  it('should read a numeric value', (): void => {
    expect(getConsentValidityPeriod({[CONSENT_VALIDITY_PERIOD_KEY]: 60})).toBe(60);
  });

  it('should keep a fraction for the server to round', (): void => {
    expect(getConsentValidityPeriod({[CONSENT_VALIDITY_PERIOD_KEY]: '100.9'})).toBe(100.9);
  });

  it.each([
    ['missing', {}],
    ['empty', {[CONSENT_VALIDITY_PERIOD_KEY]: ''}],
    ['blank', {[CONSENT_VALIDITY_PERIOD_KEY]: '  '}],
    ['not a number', {[CONSENT_VALIDITY_PERIOD_KEY]: 'abc'}],
    ['infinite', {[CONSENT_VALIDITY_PERIOD_KEY]: 'Infinity'}],
    ['an object', {[CONSENT_VALIDITY_PERIOD_KEY]: {}}],
  ])('should return undefined when the value is %s', (_label: string, inputs: Record<string, unknown>): void => {
    expect(getConsentValidityPeriod(inputs)).toBeUndefined();
  });
});
