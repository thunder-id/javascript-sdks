// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Checks whether granted permissions cover a required one, the way the ThunderID server does:
 * permissions are `:` separated paths, and a permission covers itself and everything under it, so
 * `system:user` covers `system:user:view`.
 *
 * @param granted - The permissions the caller holds, for example from {@link getTokenPermissions}.
 * @param required - The permission to check. An empty string is always covered.
 * @returns `true` when one of the granted permissions covers the required one.
 *
 * @example
 * ```typescript
 * hasPermission(['system:user'], 'system:user:view'); // true
 * ```
 */
const hasPermission = (granted: readonly string[], required: string): boolean =>
  required === '' ||
  granted.some((permission: string) => permission === required || required.startsWith(`${permission}:`));

export default hasPermission;
