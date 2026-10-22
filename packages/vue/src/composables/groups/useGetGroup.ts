// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, getGroup, type Group} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a group. Does nothing until `groupId` is set.
 *
 * @param groupId - Identifier of the resource. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetGroup = (
  groupId: MaybeRefOrGetter<string | undefined>,
  options?: ResourceQueryOptions,
): ResourceQueryResult<Group> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceQuery(
    () => [GroupQueryKeys.GROUP, toValue(groupId)],
    (fetcher) => getGroup({...endpoint, fetcher, groupId: toValue(groupId)!}),
    {...options, enabled: () => Boolean(toValue(groupId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetGroup;
