// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AttributeSchema} from '../api/getUsersMeMeta';
import CredentialConstants from '../constants/CredentialConstants';

/**
 * Whether the signed-in user's type allows them to set a password for themselves.
 *
 * The user type schema from `GET /users/me/meta` is the only thing a client can check before
 * rendering. It says whether `password` is a credential this type has at all, which is a property
 * of the type rather than of the account, so it cannot say whether this particular user has one
 * stored today. That second question is the server's to answer: it verifies the current password
 * when the account has one, and accepts a first-time set when it does not.
 *
 * Without this check the form would submit into a guaranteed failure. `POST
 * /users/me/update-credentials` rejects a `password` write on a type that declares no password
 * attribute, since the entity layer only accepts schema-declared credential keys.
 *
 * An absent schema means the answer is not known yet, either because the profile is still loading
 * or because the consuming app never supplied one. Both resolve to `true` so a change-password
 * affordance is never hidden on missing information alone, and so apps that do not wire up
 * `userSchema` keep the behaviour they had before this check existed.
 *
 * @param userSchema - The user type schema resolved by the provider, keyed by attribute.
 * @returns `false` only when the schema is known and defines no `password` attribute.
 * @example
 * ```typescript
 * if (!supportsPasswordCredential(userSchema)) {
 *   return null;
 * }
 * ```
 */
const supportsPasswordCredential = (userSchema: Record<string, AttributeSchema> | null | undefined): boolean => {
  if (!userSchema) {
    return true;
  }

  return userSchema[CredentialConstants.PASSWORD] !== undefined;
};

export default supportsPasswordCredential;
