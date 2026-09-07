// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Constants for the credential types the server accepts on the self-service
 * credential write path.
 *
 * The server keys credentials by type, and `password` is the only non system-managed
 * type a user can set for themselves.
 *
 * @example
 * ```typescript
 * await updateMeCredentials({
 *   payload: {[CredentialConstants.PASSWORD]: newPassword},
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
