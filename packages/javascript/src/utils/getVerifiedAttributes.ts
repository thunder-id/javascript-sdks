// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import AttributeVerificationConstants from '../constants/AttributeVerificationConstants';
import {User, VerifiedAttribute} from '../models/user';

/**
 * Returns the verified attributes of a `/users/me` profile, keyed by attribute name.
 *
 * A profile without the field, from a server that does not report verification, leaves every status
 * unknown, so the result is `undefined` rather than an empty record that would read as unverified.
 *
 * @param user - The profile to read.
 * @returns The verified attributes, an empty object when none is verified, or `undefined` when the
 * profile does not report them.
 */
const getVerifiedAttributes = (user?: User | null): Record<string, VerifiedAttribute> | undefined => {
  const value: unknown = user?.[AttributeVerificationConstants.VERIFIED_ATTRIBUTES_KEY];

  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, VerifiedAttribute>)
    : undefined;
};

export default getVerifiedAttributes;
