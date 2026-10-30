// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export interface KnownUser {
  displayName?: string;
  email?: string;
  familyName?: string;
  givenName?: string;
  username?: string;
}

export interface User extends KnownUser {
  [key: string]: any;
}

export interface UserProfile {
  flattenedProfile: User;
  profile: User;
}

/**
 * Verification record of one of the user's attributes, as returned in `/users/me`.
 */
export interface VerifiedAttribute {
  /**
   * When the attribute's current value was verified, as an RFC 3339 timestamp.
   */
  verifiedAt: string;
}
