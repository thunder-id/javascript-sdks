// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentValidityOptions, {
  CONSENT_VALIDITY_NEVER_SECONDS,
  type ConsentValidityOption,
} from '../getConsentValidityOptions';
import getConsentValidityOptionText, {
  getConsentValidityUnitLabel,
  type ConsentValidityTextKey,
  type ConsentValidityTranslate,
} from '../getConsentValidityOptionText';

const translate: ConsentValidityTranslate = (key: ConsentValidityTextKey, params?: Record<string, string>): string =>
  params ? `${key}(${Object.values(params).join(',')})` : key;

const optionOf = (seconds: number, limit?: number): ConsentValidityOption =>
  getConsentValidityOptions(limit).find((option: ConsentValidityOption): boolean => option.seconds === seconds)!;

const NEVER: number = CONSENT_VALIDITY_NEVER_SECONDS;

describe('getConsentValidityOptionText', (): void => {
  it('should describe a decision that is not remembered with a hint and no label', (): void => {
    expect(getConsentValidityOptionText(optionOf(1), translate, 'en-US')).toEqual({
      hint: 'hint_once',
      label: '',
    });
  });

  it('should describe consent that never expires', (): void => {
    expect(getConsentValidityOptionText(optionOf(NEVER), translate, 'en-US')).toEqual({
      hint: 'hint_never',
      label: 'option_never',
    });
  });

  it('should name a period by its length and say that the consent expires in that time', (): void => {
    expect(getConsentValidityOptionText(optionOf(2592000, 2592000), translate, 'en-US')).toEqual({
      hint: 'hint_expires(30 days)',
      label: '30 days',
    });
    expect(getConsentValidityOptionText(optionOf(3600), translate, 'en-US')).toEqual({
      hint: 'hint_expires(1 hour)',
      label: '1 hour',
    });
  });

  it('should not mark the longest period the flow allows', (): void => {
    expect(getConsentValidityOptionText(optionOf(86400, 86400), translate, 'en-US').label).toBe('1 day');
  });

  it('should write minutes and seconds for a short limit', (): void => {
    expect(getConsentValidityOptionText(optionOf(120, 120), translate, 'en-US').label).toBe('2 minutes');
    expect(getConsentValidityOptionText(optionOf(45, 45), translate, 'en-US').label).toBe('45 seconds');
  });

  it('should write durations in the language asked for', (): void => {
    const {hint, label} = getConsentValidityOptionText(optionOf(172800, 172800), translate, 'fr-FR');

    expect(label).toMatch(/^2\sjours$/);
    expect(hint).toMatch(/^hint_expires\(2\sjours\)$/);
  });

  it.each([undefined, 'not a locale'])(
    'should fall back to the runtime locale for %s',
    (locale: string | undefined): void => {
      expect(getConsentValidityOptionText(optionOf(86400, 86400), translate, locale).label).toMatch(/^.+$/);
    },
  );

  it('should not put a date or a time in the hint', (): void => {
    [60, 3600, 43200, 2592000].forEach((seconds: number): void => {
      const {hint} = getConsentValidityOptionText(optionOf(seconds), translate, 'en-US');

      expect(hint).not.toMatch(/\d{4}/);
      expect(hint).not.toMatch(/[AP]M/);
    });
  });

  it.each([
    ['second', 'seconds'],
    ['minute', 'minutes'],
    ['hour', 'hours'],
    ['day', 'days'],
  ] as const)('should name the unit %s in English as %s', (unit, expected): void => {
    expect(getConsentValidityUnitLabel(unit, 'en-US')).toBe(expected);
  });

  it('should name a unit in the language asked for, and fall back for a locale that is not valid', (): void => {
    expect(getConsentValidityUnitLabel('hour', 'fr-FR')).toBe('heures');
    expect(getConsentValidityUnitLabel('hour', 'not a locale')).toMatch(/^.+$/);
    expect(getConsentValidityUnitLabel('hour')).toMatch(/^.+$/);
  });
});
