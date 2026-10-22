// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CreateRoleRequest, Role, RoleQueryKeys, createRole} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates a role, then refetches any mounted role lists and assignment lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(payload)` to create.
 */
const useCreateRole = (
  options?: ResourceMutationOptions<Role, CreateRoleRequest>,
): ResourceMutationResult<Role, CreateRoleRequest> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceMutation(
    (payload: CreateRoleRequest, fetcher) => createRole({...endpoint, fetcher, payload}),
    () => [[RoleQueryKeys.ROLES], [RoleQueryKeys.ROLE_ASSIGNMENTS]],
    options,
  );
};

export default useCreateRole;
