// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * A user attribute collected by `BaseUserCreate`.
 */
export interface UserCreateField {
  /**
   * Label shown for the field. Defaults to the translation of `admin.users.create.fields.<name>`.
   */
  label?: string;
  /**
   * Attribute name, as defined in the user type schema.
   */
  name: string;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'tel';
}

/**
 * The attributes `UserCreate` collects when no `fields` are given.
 */
export const DEFAULT_USER_CREATE_FIELDS: UserCreateField[] = [
  {name: 'username', required: true},
  {name: 'email', required: true, type: 'email'},
  {name: 'given_name'},
  {name: 'family_name'},
  {name: 'password', type: 'password'},
];
