// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, getRoles, type RoleListResponse} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

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
 * @param params - Pagination parameters. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetRoles = (
  params: MaybeRefOrGetter<UseGetRolesParams> = {},
  options?: ResourceQueryOptions,
): ResourceQueryResult<RoleListResponse> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceQuery(
    () => {
      const {limit, offset} = toValue(params);

      return [RoleQueryKeys.ROLES, {limit, offset}];
    },
    (fetcher) => {
      const {limit, offset} = toValue(params);

      return getRoles({...endpoint, fetcher, limit, offset});
    },
    options,
  );
};

export default useGetRoles;
