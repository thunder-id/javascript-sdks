// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Role, RoleQueryKeys, getRole} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceQuery, {ResourceQueryOptions, ResourceQueryResult} from '../useResourceQuery';

/**
 * Fetches a role with the permissions it grants.
 *
 * @param roleId - Identifier of the role. Fetching waits until it is defined.
 * @param options - Query options, including a per-hook `fetcher`.
 * @returns The query state.
 */
const useGetRole = (roleId: string | undefined, options?: ResourceQueryOptions): ResourceQueryResult<Role> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceQuery([RoleQueryKeys.ROLE, roleId], (fetcher) => getRole({...endpoint, fetcher, roleId: roleId!}), {
    ...options,
    enabled: Boolean(roleId) && options?.enabled !== false,
  });
};

export default useGetRole;
