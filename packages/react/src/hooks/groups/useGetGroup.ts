// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Group, GroupQueryKeys, getGroup} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a group.
 *
 * @param groupId - Identifier of the group. Fetching waits until it is defined.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetGroup = (groupId: string | undefined, options?: ResourceQueryOptions): ResourceQueryResult<Group> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

  return useResourceQuery(
    [GroupQueryKeys.GROUP, groupId],
    (fetcher) => getGroup({...endpoint, fetcher, groupId: groupId!}),
    {
      ...options,
      enabled: Boolean(groupId) && options?.enabled !== false,
    },
  );
};

export default useGetGroup;
