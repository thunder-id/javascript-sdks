// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Defaults for turning directory users into USER_SELECT options.
 */
const UserSelectConstants: {
  LABEL_ATTRIBUTES: readonly string[];
} = {
  /**
   * Fields tried, in order, for a user's visible label before falling back to the user's ID.
   */
  LABEL_ATTRIBUTES: ['display', 'username', 'email'],
};

export default UserSelectConstants;
