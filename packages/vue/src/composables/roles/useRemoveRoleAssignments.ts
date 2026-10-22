// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, removeRoleAssignments} from '@thunderid/browser';
import type {RoleAssignmentsVariables} from './useAddRoleAssignments';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Removes a role from users, groups, apps or agents, then refetches every mounted assignment list.
 * Call `mutate({roleId, assignments})`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
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
