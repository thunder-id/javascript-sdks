// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Prefix of the form keys that mark an authorization detail field whose entered text cannot be submitted.
 */
export const CONSENT_INVALID_KEY_PREFIX = '__consent_invalid__';

/**
 * Generates the form key that marks one field of an authorization detail as holding text that cannot be
 * submitted. The stored value is `true` while the field shows such text, and empty otherwise.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param path - Dot-separated location of the field within the detail.
 * @returns A stable form key string.
 *
 * @example
 * ```typescript
 * getConsentInvalidKey('p1', 'd-1', 'instructedAmount.amount') // returns '__consent_invalid__p1__d-1__instructedAmount.amount'
 * ```
 */
const getConsentInvalidKey = (purposeId: string, detailId: string, path: string): string =>
  `${CONSENT_INVALID_KEY_PREFIX}${purposeId}__${detailId}__${path}`;

export default getConsentInvalidKey;
