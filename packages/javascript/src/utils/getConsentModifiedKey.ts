// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Prefix of the form keys that hold the values a user modified on an authorization detail.
 */
export const CONSENT_MODIFIED_KEY_PREFIX = '__consent_modified__';

/**
 * Generates the form key that holds the value a user chose for one field of an authorization
 * detail. The stored value is the JSON text of the field's new value.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param path - Dot-separated location of the field within the detail.
 * @returns A stable form key string.
 *
 * @example
 * ```typescript
 * getConsentModifiedKey('p1', 'd-1', 'instructedAmount.amount') // returns '__consent_modified__p1__d-1__instructedAmount.amount'
 * ```
 */
const getConsentModifiedKey = (purposeId: string, detailId: string, path: string): string =>
  `${CONSENT_MODIFIED_KEY_PREFIX}${purposeId}__${detailId}__${path}`;

export default getConsentModifiedKey;
