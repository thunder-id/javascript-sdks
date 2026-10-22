// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {UserQueryKeys, getUser, type ManagedUser} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a single user. Does nothing until `userId` is set.
 *
 * @param userId - Identifier of the resource. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetUser = (
  userId: MaybeRefOrGetter<string | undefined>,
  options?: ResourceQueryOptions,
): ResourceQueryResult<ManagedUser> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceQuery(
    () => [UserQueryKeys.USER, toValue(userId)],
    (fetcher) => getUser({...endpoint, fetcher, userId: toValue(userId)!}),
    {...options, enabled: () => Boolean(toValue(userId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetUser;
