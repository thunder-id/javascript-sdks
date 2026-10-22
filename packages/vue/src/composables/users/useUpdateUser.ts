// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {UserQueryKeys, type ManagedUser, type UpdateManagedUserRequest, updateUser} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables accepted by {@link useUpdateUser}'s `mutate`.
 */
export interface UpdateUserVariables {
  data: UpdateManagedUserRequest;
  userId: string;
}

/**
 * Updates a user, then refetches it and any mounted user lists. Call `mutate({userId, data})`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
 */
const useUpdateUser = (
  options?: ResourceMutationOptions<ManagedUser, UpdateUserVariables>,
): ResourceMutationResult<ManagedUser, UpdateUserVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceMutation(
    ({userId, data}: UpdateUserVariables, fetcher) => updateUser({...endpoint, fetcher, payload: data, userId}),
    ({userId}: UpdateUserVariables) => [[UserQueryKeys.USER, userId], [UserQueryKeys.USERS]],
    options,
  );
};

export default useUpdateUser;
