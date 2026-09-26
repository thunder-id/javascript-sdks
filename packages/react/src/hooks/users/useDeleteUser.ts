// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {UserQueryKeys, deleteUser} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Deletes a user, then refetches any mounted user lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(userId)` to delete.
 */
const useDeleteUser = (options?: ResourceMutationOptions<void, string>): ResourceMutationResult<void, string> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');

  return useResourceMutation(
    (userId: string, fetcher) => deleteUser({...endpoint, fetcher, userId}),
    () => [[UserQueryKeys.USERS]],
    options,
  );
};

export default useDeleteUser;
