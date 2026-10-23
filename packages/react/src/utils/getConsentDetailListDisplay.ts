// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CONSENT_DETAIL_DISPLAY_LIMITS} from './getConsentDetailLayout';

/**
 * How a consent screen shows a list of authorization detail items, given the
 * `CONSENT_DETAIL_DISPLAY_LIMITS.listItems` limit.
 *
 * @experimental This interface may change in future versions
 */
export interface ConsentDetailListDisplay {
  /** Number of items hidden behind the toggle; `0` while expanded or when the list fits. */
  hiddenCount: number;
  /** Whether the list is longer than the limit, so it is shown behind a toggle. */
  isCollapsible: boolean;
  /** Number of items to show. */
  visibleCount: number;
}

/**
 * Tells how many items of an authorization detail list a consent screen shows. A list longer than
 * `CONSENT_DETAIL_DISPLAY_LIMITS.listItems` shows that many items while collapsed, the rest behind a toggle.
 *
 * @param itemCount - Number of items in the list.
 * @param expanded - Whether the user expanded the list.
 * @returns The items to show and hide.
 *
 * @example
 * ```typescript
 * getConsentDetailListDisplay(10, false) // returns {hiddenCount: 2, isCollapsible: true, visibleCount: 8}
 * ```
 */
const getConsentDetailListDisplay = (itemCount: number, expanded: boolean): ConsentDetailListDisplay => {
  const isCollapsible: boolean = itemCount > CONSENT_DETAIL_DISPLAY_LIMITS.listItems;
  const visibleCount: number = isCollapsible && !expanded ? CONSENT_DETAIL_DISPLAY_LIMITS.listItems : itemCount;

  return {hiddenCount: itemCount - visibleCount, isCollapsible, visibleCount};
};

export default getConsentDetailListDisplay;
