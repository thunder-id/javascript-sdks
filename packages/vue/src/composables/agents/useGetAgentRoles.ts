// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, getAgentRoles, type AgentRoleListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a page of the role names assigned to an agent, directly or through its groups. Refetches
 * whenever a role assignment or a group membership changes.
 *
 * @param agentId - Identifier of the parent resource. Fetching waits until it is defined. A ref or
 * getter refetches when it changes.
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetAgentRoles = (
  agentId: MaybeRefOrGetter<string | undefined>,
  params: MaybeRefOrGetter<{limit?: number; offset?: number}> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<AgentRoleListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [RoleQueryKeys.ROLE_ASSIGNMENTS, 'agent', toValue(agentId), {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getAgentRoles({...endpoint, fetcher, limit, offset, agentId: toValue(agentId)!});
    },
    {...options, enabled: () => Boolean(toValue(agentId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetAgentRoles;
