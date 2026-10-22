// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {UserQueryKeys, createUser, type CreateManagedUserRequest, type ManagedUser} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates a user, then refetches any mounted user lists. Call `mutate(payload)` to create.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
 */
const useCreateUser = (
  options?: ResourceMutationOptions<ManagedUser, CreateManagedUserRequest>,
): ResourceMutationResult<ManagedUser, CreateManagedUserRequest> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceMutation(
    (payload: CreateManagedUserRequest, fetcher) => createUser({...endpoint, fetcher, payload}),
    () => [[UserQueryKeys.USERS]],
    options,
  );
};

export default useCreateUser;
