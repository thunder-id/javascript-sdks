// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import type {ConsentDetailRow} from '../../models/embedded-flow';
import getConsentDetailFewestItems from '../getConsentDetailFewestItems';

const actions: ConsentDetailRow = {label: 'Actions', modification: 'removeItems', path: 'actions', value: ['a', 'b']};

describe('getConsentDetailFewestItems', (): void => {
  it('should keep at least one item', (): void => {
    expect(getConsentDetailFewestItems(actions)).toBe(1);
    expect(getConsentDetailFewestItems({...actions, minItems: 0})).toBe(1);
  });

  it('should keep the fewest items the field declares', (): void => {
    expect(getConsentDetailFewestItems({...actions, minItems: 2})).toBe(2);
  });
});
