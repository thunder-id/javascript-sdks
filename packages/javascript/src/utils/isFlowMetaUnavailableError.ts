// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../errors/ThunderIDAPIError';

/**
 * Statuses a server answers with when it has no `GET /flow/meta` endpoint, or does not open it to this client.
 */
const UNAVAILABLE_STATUSES: ReadonlySet<number> = new Set([401, 403, 404, 405, 501]);

/**
 * Prefix of the error codes ThunderID's flow metadata endpoint answers with, such as `FM-1004` for an unknown
 * application.
 */
const FLOW_META_SERVER_ERROR_PREFIX = 'FM-';

/**
 * Tells whether a {@link getFlowMeta} failure means the server has no flow metadata to give, rather than that the
 * request failed. This is what happens when `baseUrl` points at an OpenID Connect provider other than ThunderID:
 * the provider answers `/flow/meta` with 401, 403, 404, 405 or 501, or with a body that is not JSON. Callers treat
 * such a failure as "no flow metadata" and carry on with the SDK's defaults.
 *
 * Everything else stays a real failure: a network error, a server error (5xx other than 501), and any reply that
 * carries ThunderID's own flow metadata error code (`FM-…`), such as the 404 ThunderID answers for an unknown
 * application.
 *
 * @param error - The value `getFlowMeta` rejected with.
 * @returns `true` when the server has no flow metadata endpoint.
 */
const isFlowMetaUnavailableError = (error: unknown): boolean => {
  if (!(error instanceof ThunderIDAPIError)) {
    return false;
  }

  if (error.code === 'getFlowMeta-InvalidResponseError-001') {
    return true;
  }

  if (error.code !== 'getFlowMeta-ResponseError-001' || error.statusCode === undefined) {
    return false;
  }

  if (error.serverError?.code?.startsWith(FLOW_META_SERVER_ERROR_PREFIX)) {
    return false;
  }

  return UNAVAILABLE_STATUSES.has(error.statusCode);
};

export default isFlowMetaUnavailableError;
