// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Decodes an access token's JWT payload for assertion purposes only (no signature
 * verification — the token debug pages under test do the exact same client-side decode, see
 * e.g. thunder-id/samples quickstarts/quickstart-react/src/pages/TokenDebugPage.jsx's decodeJwtPart()).
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`Expected a JWT with 3 dot-separated parts, got ${parts.length}`);
  }
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as Record<string, unknown>;
}
