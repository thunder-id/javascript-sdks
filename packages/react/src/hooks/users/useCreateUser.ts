// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CreateManagedUserRequest, ManagedUser, UserQueryKeys, createUser} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates a user, then refetches any mounted user lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(payload)` to create.
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
