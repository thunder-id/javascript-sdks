// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * How a resource server matches permissions: its `delimiter` and `hierarchicalPermissions`.
 */
export interface PermissionMatching {
  /** Defaults to `:`. */
  delimiter?: string;
  /** Whether a permission covers the ones beneath it. Defaults to `true`. */
  hierarchical?: boolean;
}

/**
 * Checks whether granted permissions cover a required one. By default it matches the way the ThunderID
 * server checks System permissions: `system:user` covers `system:user:view`. Pass `matching` for a
 * permission of your own resource server.
 *
 * @param granted - The permissions the caller holds, for example from {@link getTokenPermissions}.
 * @param required - The permission to check. An empty string is always covered.
 * @param matching - How the permission's resource server matches permissions.
 * @returns `true` when one of the granted permissions covers the required one.
 *
 * @example
 * ```typescript
 * hasPermission(['system:user'], 'system:user:view'); // true
 * hasPermission(['orders'], 'orders:create', {hierarchical: false}); // false
 * hasPermission(['orders'], 'orders.create', {delimiter: '.'}); // true
 * ```
 */
const hasPermission = (granted: readonly string[], required: string, matching: PermissionMatching = {}): boolean => {
  if (required === '') {
    return true;
  }

  const {delimiter = ':', hierarchical = true} = matching;

  return granted.some(
    (permission: string) =>
      permission === required ||
      (hierarchical && delimiter !== '' && permission !== '' && required.startsWith(`${permission}${delimiter}`)),
  );
};

export default hasPermission;
