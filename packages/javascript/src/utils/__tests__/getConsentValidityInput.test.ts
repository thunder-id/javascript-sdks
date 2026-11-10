// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentValidityInput from '../getConsentValidityInput';

describe('getConsentValidityInput', (): void => {
  it('should enable the input with the limit the server set', (): void => {
    expect(getConsentValidityInput({maxConsentValidity: '3600', promptConsentValidity: 'true'})).toEqual({
      enabled: true,
      maxValidityPeriod: 3600,
    });
  });

  it('should enable the input with no limit when the server set none', (): void => {
    expect(getConsentValidityInput({promptConsentValidity: 'true'})).toEqual({
      enabled: true,
      maxValidityPeriod: undefined,
    });
  });

  it.each([
    ['no additional data', undefined],
    ['no flag', {}],
    ['a flag that is not true', {promptConsentValidity: 'false'}],
  ])(
    'should leave the input disabled with %s',
    (_label: string, additionalData: Record<string, unknown> | undefined): void => {
      expect(getConsentValidityInput(additionalData).enabled).toBe(false);
    },
  );

  it.each([
    ['zero', '0'],
    ['negative', '-5'],
    ['not a number', 'abc'],
    ['empty', ''],
  ])('should ignore a limit that is %s', (_label: string, limit: string): void => {
    expect(
      getConsentValidityInput({maxConsentValidity: limit, promptConsentValidity: 'true'}).maxValidityPeriod,
    ).toBeUndefined();
  });
});
