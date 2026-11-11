// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from '../errors/ThunderIDAPIError';

/**
 * Tells whether a flow request failed because its execution no longer exists: it expired, or it already
 * ended. The server refuses such a request with `FES-1004`. The user can only start again from the
 * application.
 */
const isFlowExpiredError = (error: unknown): boolean =>
  error instanceof ThunderIDAPIError && error.serverError?.code === 'FES-1004';

export default isFlowExpiredError;
