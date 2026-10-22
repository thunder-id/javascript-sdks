// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, getAgentGroups, type MembershipGroupListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of the groups an agent belongs to.
 *
 * @param agentId - Identifier of the parent resource. Fetching waits until it is defined. A ref or
 * getter refetches when it changes.
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetAgentGroups = (
  agentId: MaybeRefOrGetter<string | undefined>,
  params: MaybeRefOrGetter<{limit?: number; offset?: number}> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<MembershipGroupListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [GroupQueryKeys.MEMBERSHIPS, 'agent', toValue(agentId), {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getAgentGroups({...endpoint, fetcher, limit, offset, agentId: toValue(agentId)!});
    },
    {...options, enabled: () => Boolean(toValue(agentId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetAgentGroups;
