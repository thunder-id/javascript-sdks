// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentValidityCustomPeriod, {
  getConsentValidityCustomMax,
  getConsentValidityCustomUnits,
  splitConsentValidityPeriod,
} from '../getConsentValidityCustomPeriod';
import {CONSENT_VALIDITY_NEVER_SECONDS} from '../getConsentValidityOptions';

describe('getConsentValidityCustomUnits', (): void => {
  it('should offer every unit when there is no limit', (): void => {
    expect(getConsentValidityCustomUnits()).toEqual(['second', 'minute', 'hour', 'day']);
    expect(getConsentValidityCustomUnits(CONSENT_VALIDITY_NEVER_SECONDS)).toEqual(['second', 'minute', 'hour', 'day']);
  });

  it.each([
    [10000, ['second', 'minute', 'hour']],
    [86400, ['second', 'minute', 'hour', 'day']],
    [3599, ['second', 'minute']],
    [60, ['second', 'minute']],
    [59, ['second']],
    [1, ['second']],
  ])('should offer only the units that fit a limit of %i seconds', (limit: number, expected: string[]): void => {
    expect(getConsentValidityCustomUnits(limit)).toEqual(expected);
  });
});

describe('getConsentValidityCustomMax', (): void => {
  it.each([
    [10000, 'second', 10000],
    [10000, 'minute', 166],
    [10000, 'hour', 2],
    [86400, 'day', 1],
  ] as const)('should hold a limit of %i seconds to %i %s at most', (limit, unit, expected): void => {
    expect(getConsentValidityCustomMax(limit, unit)).toBe(expected);
  });

  it('should have no maximum when there is no limit', (): void => {
    expect(getConsentValidityCustomMax(undefined, 'day')).toBeUndefined();
    expect(getConsentValidityCustomMax(0, 'minute')).toBeUndefined();
  });
});

describe('splitConsentValidityPeriod', (): void => {
  it.each([
    [7200, ['second', 'minute', 'hour'], '2', 'hour'],
    [259200, ['second', 'minute', 'hour', 'day'], '3', 'day'],
    [259200, ['second', 'minute', 'hour'], '72', 'hour'],
    [90, ['second', 'minute', 'hour'], '90', 'second'],
    [120, ['second', 'minute', 'hour'], '2', 'minute'],
    [12345, ['second', 'minute', 'hour'], '12345', 'second'],
  ] as const)('should show %i seconds in the largest whole unit', (seconds, units, amount, unit): void => {
    expect(splitConsentValidityPeriod(seconds, units)).toEqual({amount, unit});
  });
});

describe('getConsentValidityCustomPeriod', (): void => {
  it('should read the seconds typed when no unit is given', (): void => {
    expect(getConsentValidityCustomPeriod('90', 3600)).toEqual({amount: '90', seconds: '90'});
    expect(getConsentValidityCustomPeriod(' 90 ', 3600)).toEqual({amount: '90', seconds: '90'});
  });

  it.each([
    ['3', 'minute', '180'],
    ['3', 'hour', '10800'],
    ['2', 'day', '172800'],
    ['45', 'second', '45'],
  ] as const)('should turn %s %s into %s seconds', (text, unit, seconds): void => {
    expect(getConsentValidityCustomPeriod(text, 86400 * 10, unit)).toEqual({amount: text, seconds});
  });

  it('should hold a period above the limit at the most whole units that fit it', (): void => {
    expect(getConsentValidityCustomPeriod('9999', 3600)).toEqual({amount: '3600', seconds: '3600'});
    expect(getConsentValidityCustomPeriod('9', 3600, 'hour')).toEqual({amount: '1', seconds: '3600'});
    expect(getConsentValidityCustomPeriod('500', 10000, 'minute')).toEqual({amount: '166', seconds: '9960'});
    expect(getConsentValidityCustomPeriod('500', 252, 'minute')).toEqual({amount: '4', seconds: '240'});
  });

  it('should hold a period at the largest 32-bit integer when there is no limit', (): void => {
    const result = getConsentValidityCustomPeriod('99999999999', undefined);

    expect(result.seconds).toBe(String(CONSENT_VALIDITY_NEVER_SECONDS));
    expect(getConsentValidityCustomPeriod('99999999999', 0).seconds).toBe(String(CONSENT_VALIDITY_NEVER_SECONDS));
    expect(getConsentValidityCustomPeriod('99999999999', CONSENT_VALIDITY_NEVER_SECONDS, 'day')).toEqual({
      amount: '24855',
      seconds: '2147472000',
    });
  });

  it('should count a unit longer than the limit in seconds', (): void => {
    expect(getConsentValidityCustomPeriod('30', 45, 'minute')).toEqual({amount: '30', seconds: '30'});
    expect(getConsentValidityCustomPeriod('90', 45, 'hour')).toEqual({amount: '45', seconds: '45'});
  });

  it('should drop leading zeros', (): void => {
    expect(getConsentValidityCustomPeriod('007', 3600, 'minute')).toEqual({amount: '7', seconds: '420'});
  });

  it.each(['', ' ', '0', '00', '-5', '1.5', '1e3', 'abc', '12abc', '+5'])(
    'should return nothing for %j, which is not a whole number from one',
    (text: string): void => {
      expect(getConsentValidityCustomPeriod(text, 3600, 'minute')).toEqual({amount: '', seconds: ''});
    },
  );
});
