// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

const ATTRIBUTE_PATTERN: RegExp = /^\w+(?:\.\w+)*$/;

/**
 * Builds the filter expression the management list endpoints accept, `attribute eq "value"`, for
 * example to search users by username. The server matches the whole value exactly.
 *
 * @param attribute - The attribute to match, such as `username` or `address.city`.
 * @param value - The value to look for. Surrounding whitespace is ignored, and double quotes, which
 *   the expression cannot carry, are removed.
 * @returns The expression, or `undefined` when the value is blank or the attribute name is not valid.
 *
 * @example
 * ```typescript
 * getUsers({baseUrl, filter: toEqualityFilter('username', 'ada')}); // username eq "ada"
 * ```
 */
const toEqualityFilter = (attribute: string, value: string | undefined): string | undefined => {
  const cleaned: string = (value ?? '').replace(/"/g, '').trim();

  if (!cleaned || !ATTRIBUTE_PATTERN.test(attribute)) {
    return undefined;
  }

  return `${attribute} eq "${cleaned}"`;
};

export default toEqualityFilter;
