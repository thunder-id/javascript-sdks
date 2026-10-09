// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDRuntimeError} from '@thunderid/node';
import type {FetchUsers, PagedSelectPage, PagedSelectRequest} from '@thunderid/node';
import getUsersAction, {GetUsersActionResult} from '../server/actions/getUsersAction';

/**
 * The loader behind `UserSelect`: loads users through {@link getUsersAction} with the signed-in user's server-held session.
 * Requires an existing session. `request.signal` is not forwarded because an `AbortSignal` cannot cross the server action boundary.
 */
const fetchUsersFromServer: FetchUsers = async ({
  filter,
  limit,
  offset,
}: PagedSelectRequest): Promise<PagedSelectPage> => {
  const result: GetUsersActionResult = await getUsersAction({filter, limit, offset});

  if (result.success) {
    return result.page;
  }

  // Only a server-vouched message becomes an SDK error; anything else falls back to the generic text.
  if (result.message) {
    throw new ThunderIDRuntimeError(result.message, 'getUsersAction-Error-001', 'nextjs');
  }

  throw new Error(result.messageKey);
};

export default fetchUsersFromServer;
