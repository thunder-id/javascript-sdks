// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentValidityOptions, {
  CONSENT_VALIDITY_NEVER_SECONDS,
  CONSENT_VALIDITY_ONCE_SECONDS,
  isConsentValidityUnlimited,
  type ConsentValidityOption,
} from '../getConsentValidityOptions';

const seconds = (options: ConsentValidityOption[]): number[] =>
  options.map((option: ConsentValidityOption): number => option.seconds);

const NEVER: number = CONSENT_VALIDITY_NEVER_SECONDS;
const MAX_PERIODS = 5;

const periodsOf = (limit?: number): ConsentValidityOption[] =>
  getConsentValidityOptions(limit).filter((option: ConsentValidityOption): boolean => option.kind !== 'once');

describe('getConsentValidityOptions', (): void => {
  it('should spread five choices over the whole ladder, ending with no expiry, when the flow sets no limit', (): void => {
    const options: ConsentValidityOption[] = getConsentValidityOptions();

    expect(seconds(options)).toEqual([CONSENT_VALIDITY_ONCE_SECONDS, 60, 3600, 43200, 2592000, NEVER]);
    expect(options.map((option: ConsentValidityOption): string => option.kind)).toEqual([
      'once',
      'period',
      'period',
      'period',
      'period',
      'never',
    ]);
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['below one second', 0.5],
    ['not a number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['the largest 32-bit integer', NEVER],
  ])('should treat a limit that is %s as no limit', (_label: string, limit: number): void => {
    expect(getConsentValidityOptions(limit)).toEqual(getConsentValidityOptions());
  });

  it.each([
    [undefined, true],
    [0, true],
    [NEVER, true],
    [2592000, false],
    [1, false],
  ])('should tell whether a limit of %s is no limit: %s', (limit: number | undefined, expected: boolean): void => {
    expect(isConsentValidityUnlimited(limit)).toBe(expected);
  });

  it.each([
    [5184000, [60, 1800, 43200, 172800, 5184000]],
    [2592000, [60, 1800, 21600, 86400, 2592000]],
    [172800, [60, 1800, 21600, 43200, 172800]],
    [86400, [60, 1800, 3600, 43200, 86400]],
    [43200, [60, 300, 3600, 21600, 43200]],
    [21600, [60, 300, 1800, 3600, 21600]],
    [3600, [60, 300, 1800, 3600]],
    [1800, [60, 300, 1800]],
  ])('should list the standard periods up to a limit of %i seconds, ending with the limit', (limit, expected): void => {
    expect(seconds(periodsOf(limit))).toEqual(expected);
  });

  it('should keep the shortest and the longest standard period and spread the rest when more than five fit', (): void => {
    const periods: ConsentValidityOption[] = periodsOf(5184000);

    expect(periods).toHaveLength(MAX_PERIODS);
    expect(periods[0].seconds).toBe(60);
    expect(periods.at(-1)?.seconds).toBe(5184000);
  });

  it('should not list the limit when it is not a standard period and enough standard periods fit', (): void => {
    expect(seconds(periodsOf(10000))).toEqual([60, 300, 1800, 3600]);
    expect(seconds(periodsOf(2700))).toEqual([60, 300, 1800]);
    expect(seconds(periodsOf(100000))).toEqual([60, 1800, 3600, 43200, 86400]);
  });

  it.each([
    [600, [60, 300, 600]],
    [252, [60, 240]],
    [370, [60, 300, 360]],
    [200, [60, 180]],
    [1000, [60, 300, 960]],
    [45, [45]],
    [30, [30]],
  ])(
    'should add the limit when fewer than three standard periods fit: a limit of %i seconds',
    (limit, expected): void => {
      expect(seconds(periodsOf(limit))).toEqual(expected);
    },
  );

  it.each([
    [330, [60, 300]],
    [119, [60]],
    [100, [60]],
    [61, [60]],
  ])(
    'should not repeat a standard period when the added limit rounds down to it: a limit of %i seconds',
    (limit, expected): void => {
      expect(seconds(periodsOf(limit))).toEqual(expected);
    },
  );

  it('should use whole seconds when the limit is fractional', (): void => {
    expect(seconds(periodsOf(252.9))).toEqual([60, 240]);
  });

  it('should add the limit as a period that never exceeds it', (): void => {
    [45, 100, 200, 252, 330, 599, 1000, 1799].forEach((limit: number): void => {
      periodsOf(limit).forEach((period: ConsentValidityOption): void => {
        expect(period.seconds).toBeLessThanOrEqual(limit);
      });
    });
  });

  it('should not repeat a standard period that is the limit', (): void => {
    expect(seconds(periodsOf(300))).toEqual([60, 300]);
    expect(seconds(periodsOf(60))).toEqual([60]);
  });

  it('should never list more than five periods or repeat one', (): void => {
    [undefined, 5184000, 2592000, 604800, 172800, 100000000].forEach((limit: number | undefined): void => {
      const periods: ConsentValidityOption[] = periodsOf(limit);

      expect(periods.length).toBeLessThanOrEqual(MAX_PERIODS);
      expect(new Set(seconds(periods)).size).toBe(periods.length);
    });
  });

  it('should show a limit that is added as a whole number of its largest unit, rounded down', (): void => {
    expect(periodsOf(600).at(-1)).toMatchObject({amount: 10, kind: 'period', seconds: 600, unit: 'minute'});
    expect(periodsOf(370).at(-1)).toMatchObject({
      amount: 6,
      id: '360',
      kind: 'period',
      seconds: 360,
      unit: 'minute',
      value: '360',
    });
    expect(periodsOf(252).at(-1)).toMatchObject({
      amount: 4,
      id: '240',
      kind: 'period',
      seconds: 240,
      unit: 'minute',
      value: '240',
    });
    expect(periodsOf(45).at(-1)).toMatchObject({amount: 45, kind: 'period', seconds: 45, unit: 'second'});
  });

  it('should show the standard periods in their largest whole unit', (): void => {
    const byUnit = periodsOf(5184000).map((option: ConsentValidityOption) => [option.amount, option.unit]);

    expect(byUnit).toEqual([
      [1, 'minute'],
      [30, 'minute'],
      [12, 'hour'],
      [2, 'day'],
      [60, 'day'],
    ]);
  });

  it('should submit the seconds of every option, including consent that does not expire', (): void => {
    getConsentValidityOptions().forEach((option: ConsentValidityOption): void => {
      expect(option.value).toBe(String(option.seconds));
    });
  });

  it('should give every option a distinct id that is never empty', (): void => {
    [undefined, 5184000, 2592000, 86400, 1, 2, 2700, 600].forEach((limit: number | undefined): void => {
      const ids: string[] = getConsentValidityOptions(limit).map((option: ConsentValidityOption): string => option.id);

      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id: string): boolean => id !== '')).toBe(true);
    });
  });

  it('should leave only the limit when it is not longer than the value for a decision that is not remembered', (): void => {
    expect(seconds(getConsentValidityOptions(1))).toEqual([1]);
    expect(getConsentValidityOptions(1)[0]).toMatchObject({kind: 'period', value: '1'});
  });

  it('should offer the value for a decision that is not remembered when the limit is just above it', (): void => {
    expect(seconds(getConsentValidityOptions(2))).toEqual([1, 2]);
  });
});
