// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Constants for the credential types the server accepts on the self-service
 * credential write path.
 *
 * The server keys credentials by type. `password` is the one every user type schema
 * declares by default, hence a named constant for it; any other schema-declared
 * `credential: true` attribute (for example `pin`) can be self-managed too, just by its
 * own attribute name rather than a constant here.
 *
 * @example
 * ```typescript
 * await updateMeCredentials({
 *   payload: {currentValue: currentPassword, name: CredentialConstants.PASSWORD, newValue: newPassword},
 *   url,
 * });
 * ```
 */
const CredentialConstants: {
  PASSWORD: string;
} = {
  /**
   * The credential attribute written when changing a password. Also the key the user
   * type schema stores the password `regex` under.
   */
  PASSWORD: 'password',
} as const;

export default CredentialConstants;
