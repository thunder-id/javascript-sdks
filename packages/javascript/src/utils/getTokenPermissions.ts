// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Reads the permissions an access token grants from its `scope` claim (a space separated string)
 * or `scopes` claim (a list), the two forms the ThunderID server accepts.
 *
 * The token is decoded, not verified: use the result only to decide what to show. The server still
 * checks every request.
 *
 * @param accessToken - A JWT access token.
 * @returns The granted permissions, or an empty list when the token is not a readable JWT.
 *
 * @example
 * ```typescript
 * const permissions = getTokenPermissions(await getAccessToken());
 * ```
 */
const getTokenPermissions = (accessToken: string | undefined): string[] => {
  const payloadPart: string | undefined = accessToken?.split('.')[1];

  if (!payloadPart) {
    return [];
  }

  try {
    const base64: string = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded: string = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload: Record<string, unknown> = JSON.parse(
      decodeURIComponent(
        Array.from(atob(padded), (char: string) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
      ),
    ) as Record<string, unknown>;

    const {scope, scopes} = payload;

    if (Array.isArray(scopes)) {
      return scopes.filter((entry: unknown): entry is string => typeof entry === 'string');
    }

    if (typeof scope === 'string') {
      return scope.split(' ').filter((entry: string) => entry.length > 0);
    }

    return [];
  } catch {
    return [];
  }
};

export default getTokenPermissions;
