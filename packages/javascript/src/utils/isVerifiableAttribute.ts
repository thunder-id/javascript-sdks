// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AttributeSchema} from '../api/account/getUsersMeMeta';
import AttributeVerificationConstants from '../constants/AttributeVerificationConstants';

/**
 * Whether the signed-in user can verify the given attribute: a top-level, single-valued property of
 * type `email` or `mobile` in the user type schema from `GET /users/me/meta`.
 *
 * Schema keys are top-level properties, and a multi-valued property has type `array`, so both are
 * settled by the property's own type. An absent schema, or one without the attribute, leaves the
 * type unknown and resolves to `false`, so no verification is started on missing information.
 *
 * @param userSchema - The user type schema resolved by the provider, keyed by attribute.
 * @param attribute - The attribute to check (e.g. `email`).
 * @returns `true` only when the schema declares `attribute` with a verifiable type.
 * @example
 * ```typescript
 * if (!isVerifiableAttribute(userSchema, 'given_name')) {
 *   return null;
 * }
 * ```
 */
const isVerifiableAttribute = (
  userSchema: Record<string, AttributeSchema> | null | undefined,
  attribute: string,
): boolean => {
  if (!userSchema || !attribute || !Object.prototype.hasOwnProperty.call(userSchema, attribute)) {
    return false;
  }

  const type: string | undefined = userSchema[attribute]?.type;

  return (
    typeof type === 'string' && AttributeVerificationConstants.VERIFIABLE_ATTRIBUTE_TYPES.includes(type.toLowerCase())
  );
};

export default isVerifiableAttribute;
