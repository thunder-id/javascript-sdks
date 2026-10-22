// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, removeRoleAssignments} from '@thunderid/browser';
import {RoleAssignmentsVariables} from './useAddRoleAssignments';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Removes a role from users, groups, apps or agents, then refetches every mounted assignment list, including the roles listed for an agent.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate({roleId, assignments})`.
 */
const useRemoveRoleAssignments = (
  options?: ResourceMutationOptions<void, RoleAssignmentsVariables>,
): ResourceMutationResult<void, RoleAssignmentsVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceMutation(
    ({roleId, assignments}: RoleAssignmentsVariables, fetcher) =>
      removeRoleAssignments({...endpoint, assignments, fetcher, roleId}),
    () => [[RoleQueryKeys.ROLE_ASSIGNMENTS]],
    options,
  );
};

export default useRemoveRoleAssignments;
