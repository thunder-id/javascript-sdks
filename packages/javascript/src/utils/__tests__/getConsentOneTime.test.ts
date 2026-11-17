// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentOneTime, {CONSENT_ONE_TIME_KEY} from '../getConsentOneTime';
import {CONSENT_VALIDITY_PERIOD_KEY} from '../getConsentValidityPeriod';

describe('getConsentOneTime', (): void => {
  it('should be true when the user chose not to remember the decision', (): void => {
    expect(getConsentOneTime({[CONSENT_ONE_TIME_KEY]: 'true'})).toBe(true);
  });

  it.each([['false'], [''], [true], [1], [undefined]])(
    'should be false for %j, which is not the choice not to remember',
    (value: unknown): void => {
      expect(getConsentOneTime({[CONSENT_ONE_TIME_KEY]: value})).toBe(false);
    },
  );

  it('should be false when the form holds no choice', (): void => {
    expect(getConsentOneTime({})).toBe(false);
  });

  it('should not read a period of one second as the choice not to remember', (): void => {
    expect(getConsentOneTime({[CONSENT_VALIDITY_PERIOD_KEY]: '1'})).toBe(false);
  });
});
