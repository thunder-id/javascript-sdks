// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Application, ApplicationQueryKeys, UpdateApplicationRequest, updateApplication} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables accepted by {@link useUpdateApplication}'s `mutate`.
 */
export interface UpdateApplicationVariables {
  applicationId: string;
  data: UpdateApplicationRequest;
}

/**
 * Updates an application, then refetches it and any mounted application lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate({applicationId, data})` to update.
 */
const useUpdateApplication = (
  options?: ResourceMutationOptions<Application, UpdateApplicationVariables>,
): ResourceMutationResult<Application, UpdateApplicationVariables> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');

  return useResourceMutation(
    ({applicationId, data}: UpdateApplicationVariables, fetcher) =>
      updateApplication({...endpoint, applicationId, fetcher, payload: data}),
    ({applicationId}: UpdateApplicationVariables) => [
      [ApplicationQueryKeys.APPLICATION, applicationId],
      [ApplicationQueryKeys.APPLICATIONS],
    ],
    options,
  );
};

export default useUpdateApplication;
