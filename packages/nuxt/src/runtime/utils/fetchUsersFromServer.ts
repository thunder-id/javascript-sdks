// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDRuntimeError} from '@thunderid/browser';
import type {FetchUsers, PagedSelectPage, PagedSelectRequest} from '@thunderid/browser';
import NuxtAPIRoutes from '../constants/NuxtAPIRoutes';
import type {ThunderIDGetUsersResult} from '../types';

/**
 * The loader behind `UserSelect`: loads users through `GET /api/auth/users` with the signed-in user's server-held session.
 * Requires an existing session.
 */
export const fetchUsersFromServer: FetchUsers = async ({
  filter,
  limit,
  offset,
  signal,
}: PagedSelectRequest): Promise<PagedSelectPage> => {
  const result: ThunderIDGetUsersResult = await $fetch<ThunderIDGetUsersResult>(NuxtAPIRoutes.USERS, {
    query: {filter, limit, offset},
    signal,
  });

  if (result.success) {
    return result.page;
  }

  // Only a server-vouched message becomes an SDK error; anything else falls back to the generic text.
  if (result.message) {
    throw new ThunderIDRuntimeError(result.message, 'users.get-Error-001', 'nuxt');
  }

  throw new Error(result.messageKey);
};

export default fetchUsersFromServer;
