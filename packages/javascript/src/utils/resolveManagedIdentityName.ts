// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Picks the label to show for a managed identity: the server's `display` value, then common name
 * attributes, then the identifier.
 *
 * @param identity - A user, agent or member record.
 * @returns The label to show.
 */
const resolveManagedIdentityName = (identity: {
  attributes?: Record<string, unknown>;
  display?: string;
  id: string;
  name?: string;
}): string => {
  if (identity.display) {
    return identity.display;
  }

  const attributes: Record<string, unknown> = identity.attributes ?? {};
  const fullName: string = [attributes['given_name'], attributes['family_name']]
    .filter((part: unknown) => typeof part === 'string' && part.length > 0)
    .join(' ');

  return (
    identity.name ??
    (typeof attributes['name'] === 'string' ? attributes['name'] : undefined) ??
    (fullName || undefined) ??
    (typeof attributes['username'] === 'string' ? attributes['username'] : undefined) ??
    identity.id
  );
};

export default resolveManagedIdentityName;
