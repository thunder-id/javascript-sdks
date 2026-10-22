// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleAssignmentInput, RoleQueryKeys, addRoleAssignments} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables for {@link useAddRoleAssignments}.
 */
export interface RoleAssignmentsVariables {
  /**
   * The identities to change.
   */
  assignments: RoleAssignmentInput[];
  /**
   * Identifier of the role.
   */
  roleId: string;
}

/**
 * Assigns a role to users, groups, apps or agents, then refetches every mounted assignment list, including the roles listed for an agent.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate({roleId, assignments})`.
 */
const useAddRoleAssignments = (
  options?: ResourceMutationOptions<void, RoleAssignmentsVariables>,
): ResourceMutationResult<void, RoleAssignmentsVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

  return useResourceMutation(
    ({roleId, assignments}: RoleAssignmentsVariables, fetcher) =>
      addRoleAssignments({...endpoint, assignments, fetcher, roleId}),
    () => [[RoleQueryKeys.ROLE_ASSIGNMENTS]],
    options,
  );
};

export default useAddRoleAssignments;
