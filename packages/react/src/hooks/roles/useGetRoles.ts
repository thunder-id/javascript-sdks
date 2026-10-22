// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleListResponse, RoleQueryKeys, getRoles} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Parameters for {@link useGetRoles}.
 */
export interface UseGetRolesParams {
  limit?: number;
  offset?: number;
}

/**
 * Fetches a page of roles.
 *
 * @param params - Pagination parameters.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetRoles = (
  {limit, offset}: UseGetRolesParams = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<RoleListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceQuery(
    [RoleQueryKeys.ROLES, {limit, offset}],
    (fetcher) => getRoles({...endpoint, fetcher, limit, offset}),
    options,
  );
};

export default useGetRoles;
