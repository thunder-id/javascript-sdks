// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagedUser, UserQueryKeys, getUser} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a single user. Does nothing until `userId` is set.
 *
 * @param userId - Identifier of the user.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetUser = (userId: string | undefined, options?: ResourceQueryOptions): ResourceQueryResult<ManagedUser> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceQuery([UserQueryKeys.USER, userId], (fetcher) => getUser({...endpoint, fetcher, userId: userId!}), {
    ...options,
    enabled: Boolean(userId) && options?.enabled !== false,
  });
};

export default useGetUser;
