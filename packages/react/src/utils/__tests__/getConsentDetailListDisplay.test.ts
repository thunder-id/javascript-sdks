// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {CONSENT_DETAIL_DISPLAY_LIMITS} from '../getConsentDetailLayout';
import getConsentDetailListDisplay from '../getConsentDetailListDisplay';

describe('getConsentDetailListDisplay', (): void => {
  const {listItems} = CONSENT_DETAIL_DISPLAY_LIMITS;

  it('should show every item of a list that fits', (): void => {
    expect(getConsentDetailListDisplay(listItems, false)).toEqual({
      hiddenCount: 0,
      isCollapsible: false,
      visibleCount: listItems,
    });
  });

  it('should hide the items past the limit until the list is expanded', (): void => {
    expect(getConsentDetailListDisplay(listItems + 2, false)).toEqual({
      hiddenCount: 2,
      isCollapsible: true,
      visibleCount: listItems,
    });
    expect(getConsentDetailListDisplay(listItems + 2, true)).toEqual({
      hiddenCount: 0,
      isCollapsible: true,
      visibleCount: listItems + 2,
    });
  });
});
