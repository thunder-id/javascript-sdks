// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import getConsentInvalidKey from './getConsentInvalidKey';
import getConsentModifiedKey from './getConsentModifiedKey';
import {ConsentDetailRow, PromptElement} from '../models/embedded-flow';

/**
 * Collects the values a user modified on an authorization detail element, for the `modified` member
 * of its consent decision. Only fields the element lets the user modify are read, and a field left at
 * the value that was shown, or marked as holding text that cannot be submitted, is left out.
 *
 * @param purposeId - The identifier of the consent purpose the element belongs to.
 * @param element - The authorization detail element.
 * @param inputs - Form values, holding the JSON text of each changed field under its modified key and its
 * invalid marker under its invalid key.
 * @returns The changed values keyed by field path, or `undefined` when nothing was changed.
 *
 * @example
 * ```typescript
 * getConsentModifiedValues('p1', element, {'__consent_modified__p1__d-1__amount': '20'}) // returns {amount: 20}
 * ```
 */
const getConsentModifiedValues = (
  purposeId: string,
  element: PromptElement,
  inputs: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const modified: Record<string, unknown> = {};

  (element.rows ?? []).forEach((row: ConsentDetailRow) => {
    if (!row.modification) return;
    if (inputs[getConsentInvalidKey(purposeId, element.name, row.path)] === 'true') return;
    const raw: unknown = inputs[getConsentModifiedKey(purposeId, element.name, row.path)];
    if (typeof raw !== 'string' || raw === '') return;

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return;
    }
    if (JSON.stringify(value) === JSON.stringify(row.value)) return;
    modified[row.path] = value;
  });

  return Object.keys(modified).length > 0 ? modified : undefined;
};

export default getConsentModifiedValues;
