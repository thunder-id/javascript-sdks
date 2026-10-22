// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, getRole, type Role} from '@thunderid/browser';
import {type MaybeRefOrGetter, toValue} from 'vue';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {type ResourceQueryOptions, type ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a role with the permissions it grants. Does nothing until `roleId` is set.
 *
 * @param roleId - Identifier of the resource. A ref or getter refetches when it changes.
 * @param options - Query options, including a per-composable `fetcher`.
 * @returns The query state.
 */
const useGetRole = (
  roleId: MaybeRefOrGetter<string | undefined>,
  options?: ResourceQueryOptions,
): ResourceQueryResult<Role> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceQuery(
    () => [RoleQueryKeys.ROLE, toValue(roleId)],
    (fetcher) => getRole({...endpoint, fetcher, roleId: toValue(roleId)!}),
    {...options, enabled: () => Boolean(toValue(roleId)) && toValue(options?.enabled) !== false},
  );
};

export default useGetRole;
