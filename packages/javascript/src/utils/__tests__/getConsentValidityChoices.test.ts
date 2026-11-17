// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentValidityChoices from '../getConsentValidityChoices';
import {CONSENT_VALIDITY_NEVER_SECONDS, type ConsentValidityOption} from '../getConsentValidityOptions';

const seconds = (options: ConsentValidityOption[]): number[] =>
  options.map((option: ConsentValidityOption): number => option.seconds);

describe('getConsentValidityChoices', (): void => {
  it('should remember the decision when the form holds nothing, and select the shortest period', (): void => {
    const choices = getConsentValidityChoices(86400, '');

    expect(choices.remember).toBe(true);
    expect(choices.selected).toBe(choices.initial);
    expect(choices.initial).toMatchObject({kind: 'period', seconds: 60, value: '60'});
    expect(seconds(choices.remembered)).toEqual([60, 1800, 3600, 43200, 86400]);
  });

  it('should start at the limit when it is shorter than every period', (): void => {
    expect(getConsentValidityChoices(30, '').initial.seconds).toBe(30);
  });

  it('should keep the value for a decision that is not remembered out of the periods', (): void => {
    const choices = getConsentValidityChoices(86400, '');

    expect(choices.once).toMatchObject({kind: 'once', seconds: 1});
    expect(choices.remembered.some((option: ConsentValidityOption): boolean => option.kind === 'once')).toBe(false);
  });

  it('should not remember the decision when the form holds the value for that', (): void => {
    const choices = getConsentValidityChoices(86400, '1');

    expect(choices.remember).toBe(false);
    expect(choices.selected).toBe(choices.once);
  });

  it('should select the period the form holds', (): void => {
    const choices = getConsentValidityChoices(86400, '3600');

    expect(choices.remember).toBe(true);
    expect(choices.selected?.seconds).toBe(3600);
  });

  it('should take the box as ticked when the caller says so, even for the value for a decision that is not remembered', (): void => {
    const choices = getConsentValidityChoices(86400, '1', true);

    expect(choices.remember).toBe(true);
    expect(choices.selected).toBeUndefined();
  });

  it('should take the box as unticked when the caller says so', (): void => {
    const choices = getConsentValidityChoices(86400, '', false);

    expect(choices.remember).toBe(false);
    expect(choices.selected).toBe(choices.once);
  });

  it('should always take the box as ticked when the limit leaves no room for the other value', (): void => {
    expect(getConsentValidityChoices(1, '', false).remember).toBe(true);
  });

  it("should select no option when the form holds a period of the user's own", (): void => {
    const choices = getConsentValidityChoices(86400, '12345');

    expect(choices.remember).toBe(true);
    expect(choices.selected).toBeUndefined();
  });

  it('should select no option for a standard period that the list left out', (): void => {
    expect(getConsentValidityChoices(2592000, '300').selected).toBeUndefined();
  });

  it('should end the periods with consent that never expires when there is no limit', (): void => {
    const choices = getConsentValidityChoices(undefined, '');

    expect(choices.remembered.at(-1)).toMatchObject({kind: 'never', seconds: CONSENT_VALIDITY_NEVER_SECONDS});
  });

  it('should select consent that never expires by its value', (): void => {
    const choices = getConsentValidityChoices(CONSENT_VALIDITY_NEVER_SECONDS, String(CONSENT_VALIDITY_NEVER_SECONDS));

    expect(choices.selected).toMatchObject({kind: 'never'});
  });

  it('should offer no value for a decision that is not remembered when the limit leaves no room for it', (): void => {
    const choices = getConsentValidityChoices(1, '');

    expect(choices.once).toBeUndefined();
    expect(choices.remember).toBe(true);
    expect(seconds(choices.remembered)).toEqual([1]);
    expect(choices.selected).toBe(choices.initial);
  });
});
