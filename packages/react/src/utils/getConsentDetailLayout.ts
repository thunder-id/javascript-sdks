// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type ConsentDetailRow} from '@thunderid/browser';
import formatConsentDetailValue from './formatConsentDetailValue';
import isConsentDetailStructured from './isConsentDetailStructured';

/**
 * Limits a consent screen applies to authorization detail content so that a long or large value never
 * crowds the layout. Text longer than a `*Chars` limit is clamped to its `*Lines` limit behind a toggle,
 * and a list longer than `listItems` shows that many items behind a toggle.
 */
export const CONSENT_DETAIL_DISPLAY_LIMITS: Readonly<{
  inlineLabelChars: number;
  inlineValueChars: number;
  listItems: number;
  structuredLines: number;
  summaryChars: number;
  summaryLines: number;
  valueChars: number;
  valueLines: number;
}> = Object.freeze({
  inlineLabelChars: 32,
  inlineValueChars: 32,
  listItems: 8,
  structuredLines: 8,
  summaryChars: 160,
  summaryLines: 3,
  valueChars: 160,
  valueLines: 4,
});

/**
 * Chooses how a consent screen lays out one authorization detail field. A short label and a short value
 * sit side by side; a long label, a long value, a long list or a structured value is stacked, the label
 * above the value, so neither squeezes the other.
 *
 * @param row - Field to lay out.
 * @returns `inline` or `stacked`.
 *
 * @example
 * ```typescript
 * getConsentDetailLayout({label: 'Pay to', path: 'creditorName', value: 'Merchant A'}) // returns 'inline'
 * ```
 */
const getConsentDetailLayout = (row: ConsentDetailRow): 'inline' | 'stacked' => {
  const label: string = row.label || row.path;
  if (label.length > CONSENT_DETAIL_DISPLAY_LIMITS.inlineLabelChars || isConsentDetailStructured(row.value)) {
    return 'stacked';
  }

  const items: unknown[] = Array.isArray(row.value) ? [...(row.value as unknown[])] : [row.value];
  if (row.modification === 'addItems' && Array.isArray(row.options)) {
    items.push(...row.options);
  }
  const text: string = formatConsentDetailValue(items);

  return text.length > CONSENT_DETAIL_DISPLAY_LIMITS.inlineValueChars ? 'stacked' : 'inline';
};

export default getConsentDetailLayout;
