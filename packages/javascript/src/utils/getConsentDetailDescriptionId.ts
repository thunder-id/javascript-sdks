// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Gives the identifier of the element that shows an authorization detail field's description, so the
 * field's controls can point to it with `aria-describedby`.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param path - Dot-separated location of the field within the detail.
 * @returns The element identifier.
 *
 * @example
 * ```typescript
 * getConsentDetailDescriptionId('p1', 'd-1', 'amount') // returns 'consent_modify_p1_d-1_amount_description'
 * ```
 */
const getConsentDetailDescriptionId = (purposeId: string, detailId: string, path: string): string =>
  `consent_modify_${purposeId}_${detailId}_${path}_description`;

export default getConsentDetailDescriptionId;
