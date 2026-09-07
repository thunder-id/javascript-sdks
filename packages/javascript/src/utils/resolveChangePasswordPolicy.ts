// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {PasswordPolicy} from './evaluatePasswordPolicy';
import {AttributeSchema} from '../api/getUsersMeMeta';
import CredentialConstants from '../constants/CredentialConstants';

/**
 * Resolves the password rules a change-password form should enforce.
 *
 * The organization's own password policy, expressed as the `password` attribute's `regex`
 * in `GET /users/me/meta`, is the sole source of truth: the SDK does not layer its own
 * character-class or length rules on top, since doing so could reject a password the
 * organization's policy accepts. When the schema carries no regex, there is no policy to
 * check client-side and the requirement checklist is simply empty.
 *
 * @param userSchema - The user type schema resolved by the provider, keyed by attribute.
 * @param override - An explicit policy supplied by the caller, which wins outright.
 * @returns The policy to hand to {@link evaluatePasswordPolicy}.
 * @example
 * ```typescript
 * const policy = resolveChangePasswordPolicy(userSchema, undefined);
 * const results = evaluatePasswordPolicy(candidate, policy);
 * ```
 */
const resolveChangePasswordPolicy = (
  userSchema: Record<string, AttributeSchema> | null | undefined,
  override?: PasswordPolicy,
): PasswordPolicy => {
  if (override) {
    return override;
  }

  const schemaRegex: string | undefined = userSchema?.[CredentialConstants.PASSWORD]?.regex;

  return schemaRegex ? {regex: schemaRegex} : {};
};

export default resolveChangePasswordPolicy;
