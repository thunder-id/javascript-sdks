// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, deleteRole} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Deletes a role, then refetches any mounted role lists and assignment lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(roleId)` to delete.
 */
const useDeleteRole = (options?: ResourceMutationOptions<void, string>): ResourceMutationResult<void, string> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceMutation(
    (roleId: string, fetcher) => deleteRole({...endpoint, fetcher, roleId}),
    () => [[RoleQueryKeys.ROLES], [RoleQueryKeys.ROLE_ASSIGNMENTS]],
    options,
  );
};

export default useDeleteRole;
