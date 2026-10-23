// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import getConsentModifiedValues from './getConsentModifiedValues';
import {ConsentAttributeElement, PromptElement} from '../models/embedded-flow';

/**
 * Builds the decision on one optional consent element. An approved authorization detail element carries
 * the values the user modified on it; any other element carries only its name and approval.
 *
 * @param purposeId - The identifier of the consent purpose the element belongs to.
 * @param element - The consent element.
 * @param approved - Whether the user approved the element.
 * @param inputs - Form values, holding the JSON text of each modified field under its modified key.
 * @returns The element decision.
 *
 * @example
 * ```typescript
 * getConsentElementDecision('p1', element, true, {'__consent_modified__p1__d-1__amount': '20'})
 * // returns {approved: true, name: 'd-1', modified: {amount: 20}}
 * ```
 */
const getConsentElementDecision = (
  purposeId: string,
  element: PromptElement,
  approved: boolean,
  inputs: Record<string, unknown>,
): ConsentAttributeElement => {
  const modified: Record<string, unknown> | undefined = approved
    ? getConsentModifiedValues(purposeId, element, inputs)
    : undefined;

  return {approved, name: element.name, ...(modified ? {modified} : {})};
};

export default getConsentElementDecision;
