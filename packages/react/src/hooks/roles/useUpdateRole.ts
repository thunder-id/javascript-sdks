// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Role, RoleQueryKeys, UpdateRoleRequest, updateRole} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables for {@link useUpdateRole}.
 */
export interface UpdateRoleVariables {
  /**
   * The role's new state.
   */
  data: UpdateRoleRequest;
  /**
   * Identifier of the role to update.
   */
  roleId: string;
}

/**
 * Replaces a role's name, description and permissions, then refetches the role and any mounted role lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate({roleId, data})` to update.
 */
const useUpdateRole = (
  options?: ResourceMutationOptions<Role, UpdateRoleVariables>,
): ResourceMutationResult<Role, UpdateRoleVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceMutation(
    ({roleId, data}: UpdateRoleVariables, fetcher) => updateRole({...endpoint, fetcher, payload: data, roleId}),
    ({roleId}: UpdateRoleVariables) => [[RoleQueryKeys.ROLE, roleId], [RoleQueryKeys.ROLES]],
    options,
  );
};

export default useUpdateRole;
