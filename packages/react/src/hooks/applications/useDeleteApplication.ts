// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApplicationQueryKeys, deleteApplication} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Deletes an application, then refetches any mounted application lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(applicationId)` to delete.
 */
const useDeleteApplication = (
  options?: ResourceMutationOptions<void, string>,
): ResourceMutationResult<void, string> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');

  return useResourceMutation(
    (applicationId: string, fetcher) => deleteApplication({...endpoint, applicationId, fetcher}),
    () => [[ApplicationQueryKeys.APPLICATIONS]],
    options,
  );
};

export default useDeleteApplication;
