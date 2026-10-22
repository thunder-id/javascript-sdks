// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleAssigneeType, RoleAssignmentListResponse, RoleQueryKeys, getRoleAssignments} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

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
 * @param roleId - Identifier of the role. Fetching waits until it is defined.
 * @param params - Pagination and assignee type parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetRoleAssignments = (
  roleId: string | undefined,
  {limit, offset, type}: UseGetRoleAssignmentsParams = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<RoleAssignmentListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceQuery(
    [RoleQueryKeys.ROLE_ASSIGNMENTS, roleId, {limit, offset, type}],
    (fetcher) => getRoleAssignments({...endpoint, fetcher, limit, offset, roleId: roleId!, type}),
    {...options, enabled: Boolean(roleId) && options?.enabled !== false},
  );
};

export default useGetRoleAssignments;
