// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagedUser, UpdateManagedUserRequest, UserQueryKeys, updateUser} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables accepted by {@link useUpdateUser}'s `mutate`.
 */
export interface UpdateUserVariables {
  data: UpdateManagedUserRequest;
  userId: string;
}

/**
 * Updates a user, then refetches it and any mounted user lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate({userId, data})` to update.
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
