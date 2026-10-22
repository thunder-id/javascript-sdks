// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  RoleQueryKeys,
  getRoleAssignments,
  type RoleAssigneeType,
  type RoleAssignmentListResponse,
} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Parameters for {@link useGetRoleAssignments}.
 */
export interface UseGetRoleAssignmentsParams {
  limit?: number;
  offset?: number;
  /**
   * Only return assignees of this type. Returns every type when omitted.
   */
  type?: RoleAssigneeType;
}

/**
 * Fetches a page of the users, groups, apps and agents a role is assigned to.
 *
 * @param roleId - Identifier of the parent resource. Fetching waits until it is defined. A ref or
 * getter refetches when it changes.
 * @param params - Pagination and assignee type parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetRoleAssignments = (
  roleId: MaybeRefOrGetter<string | undefined>,
  params: MaybeRefOrGetter<UseGetRoleAssignmentsParams> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<RoleAssignmentListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceQuery(
    () => {
      const {limit, offset, type} = toValue(params);

      return [RoleQueryKeys.ROLE_ASSIGNMENTS, toValue(roleId), {limit, offset, type}];
    },
    (fetcher) => {
      const {limit, offset, type} = toValue(params);

      return getRoleAssignments({...endpoint, fetcher, limit, offset, type, roleId: toValue(roleId)!});
    },
    {...options, enabled: () => Boolean(toValue(roleId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetRoleAssignments;
