// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * A role a role selection step offers.
 */
export interface RoleOption {
  /** The role's ID, which the step takes back. */
  id: string;
  /** The role's name, to show. */
  name: string;
}

/**
 * Reads the roles a `ROLE_SELECT` step offers from its `additionalData.roleOptions`, which the server sends as a
 * JSON array of `{id, name}`. Anything that is not such an entry is left out.
 *
 * @param raw - The `roleOptions` value: the JSON string, or an already parsed array.
 * @returns The offered roles, in the server's order.
 * @example
 * ```typescript
 * const roles = parseRoleOptions(step.data.additionalData?.roleOptions);
 * // [{id: '019...', name: 'Developer'}]
 * ```
 */
const parseRoleOptions = (raw: unknown): RoleOption[] => {
  let entries: unknown = raw;
  if (typeof raw === 'string') {
    try {
      entries = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry: unknown): RoleOption[] => {
    const {id, name} = (entry ?? {}) as {id?: unknown; name?: unknown};

    return typeof id === 'string' && id !== '' ? [{id, name: typeof name === 'string' && name !== '' ? name : id}] : [];
  });
};

export default parseRoleOptions;
