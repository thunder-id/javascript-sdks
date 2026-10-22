// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, createRole, type CreateRoleRequest, type Role} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates a role, then refetches any mounted role lists and assignment lists. Call `mutate(payload)`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
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
