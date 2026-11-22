// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getConsentDetailDescriptionId from '../getConsentDetailDescriptionId';

describe('getConsentDetailDescriptionId', (): void => {
  it('should identify the description element of a field', (): void => {
    expect(getConsentDetailDescriptionId('p1', 'd-1', 'amount')).toBe('consent_modify_p1_d-1_amount_description');
  });
});
