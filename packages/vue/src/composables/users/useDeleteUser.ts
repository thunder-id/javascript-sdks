// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {UserQueryKeys, deleteUser} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Deletes a user, then refetches any mounted user lists. Call `mutate(userId)` to delete.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
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
