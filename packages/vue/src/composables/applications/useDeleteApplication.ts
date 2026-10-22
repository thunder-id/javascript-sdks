// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApplicationQueryKeys, deleteApplication} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Deletes an application, then refetches any mounted application lists. Call `mutate(applicationId)`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
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
