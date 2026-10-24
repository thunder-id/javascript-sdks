// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type ConsentDetailRow,
  type ConsentPurposeData,
  getConsentInvalidKey,
  type PromptElement,
} from '@thunderid/browser';
import {getConsentOptionalKey} from '../components/adapters/ConsentCheckboxList';

/**
 * Reports whether any field the user may modify on an authorization detail element shows text that cannot
 * be submitted. The element must not be approved while this holds, since its decision would not carry what
 * the user sees.
 *
 * @param purposeId - The identifier of the consent purpose the element belongs to.
 * @param element - The authorization detail element.
 * @param inputs - Form values, holding the invalid marker of each field under its invalid key.
 * @returns Whether a field of the element is invalid.
 *
 * @example
 * ```typescript
 * hasInvalidConsentModification('p1', element, {'__consent_invalid__p1__d-1__amount': 'true'}) // returns true
 * ```
 */
const hasInvalidConsentModification = (
  purposeId: string,
  element: PromptElement,
  inputs: Record<string, unknown>,
): boolean =>
  (element.rows ?? []).some(
    (row: ConsentDetailRow) =>
      Boolean(row.modification) && inputs[getConsentInvalidKey(purposeId, element.name, row.path)] === 'true',
  );

/**
 * Reports whether the consent cannot be approved yet: an authorization detail the user has not declined
 * shows, in a field the user may modify, text that cannot be submitted. Denying stays possible.
 *
 * @param purposes - The consent purposes on the screen.
 * @param formValues - Form values, holding each element's approval and each field's invalid marker.
 * @returns Whether approval must wait until the user corrects the field.
 *
 * @example
 * ```typescript
 * isConsentApprovalBlocked(purposes, {'__consent_invalid__p1__d-1__amount': 'true'}) // returns true
 * ```
 */
const isConsentApprovalBlocked = (purposes: ConsentPurposeData[], formValues: Record<string, unknown>): boolean =>
  purposes.some((purpose: ConsentPurposeData) =>
    (purpose.optional ?? []).some(
      (element: PromptElement) =>
        formValues[getConsentOptionalKey(purpose.purposeId, element.name)] !== 'false' &&
        hasInvalidConsentModification(purpose.purposeId, element, formValues),
    ),
  );

export default isConsentApprovalBlocked;
