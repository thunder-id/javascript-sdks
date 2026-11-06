// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDRuntimeError from '../errors/ThunderIDRuntimeError';

const OAUTH2_SEGMENT = '/oauth2/';

/**
 * Builds the organization-unit-qualified form of an OAuth 2.0 endpoint, such as
 * `{baseUrl}/ou/{ouId}/oauth2/authorize` for `{baseUrl}/oauth2/authorize`. A sign-in started there is
 * bounded to the unit, and an authorization code from it is redeemed at the unit's token endpoint.
 *
 * The unit identifier is one path segment, so it is percent-encoded. The `/ou/{ouId}` prefix goes in
 * front of the endpoint's `/oauth2/` segment, so an endpoint discovered under a path prefix keeps it.
 * When the endpoint has no `/oauth2/` segment, the path is built from `baseUrl` and the endpoint's
 * last segment instead.
 *
 * @param endpoint - The unqualified endpoint, from discovery or derived from `baseUrl`.
 * @param ouId - Identifier of the organization unit.
 * @param baseUrl - The server's base URL, used when the endpoint cannot be qualified in place.
 * @returns The qualified endpoint URL.
 * @throws {ThunderIDRuntimeError} `JS-AUTH_CORE-OUEP-IV01` when `ouId` is empty, and
 *   `JS-AUTH_CORE-OUEP-IV02` when the endpoint cannot be qualified.
 */
const resolveOrganizationUnitEndpoint = (endpoint: string, ouId: string, baseUrl?: string): string => {
  if (typeof ouId !== 'string' || ouId.trim() === '') {
    throw new ThunderIDRuntimeError(
      'An organization unit identifier is required.',
      'JS-AUTH_CORE-OUEP-IV01',
      'javascript',
    );
  }

  const segment = `/ou/${encodeURIComponent(ouId)}`;
  const url: URL = new URL(endpoint);
  const index: number = url.pathname.indexOf(OAUTH2_SEGMENT);

  if (index >= 0) {
    url.pathname = `${url.pathname.slice(0, index)}${segment}${url.pathname.slice(index)}`;

    return url.toString();
  }

  if (baseUrl) {
    const name: string = url.pathname.split('/').filter(Boolean).pop() ?? '';

    return `${baseUrl.replace(/\/+$/, '')}${segment}/oauth2/${name}${url.search}`;
  }

  throw new ThunderIDRuntimeError(
    `The endpoint ${url.origin}${url.pathname} cannot be qualified with an organization unit.`,
    'JS-AUTH_CORE-OUEP-IV02',
    'javascript',
  );
};

export default resolveOrganizationUnitEndpoint;
