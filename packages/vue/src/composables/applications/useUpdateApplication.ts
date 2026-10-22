// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ApplicationQueryKeys,
  type Application,
  type UpdateApplicationRequest,
  updateApplication,
} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Variables accepted by {@link useUpdateApplication}'s `mutate`.
 */
export interface UpdateApplicationVariables {
  applicationId: string;
  data: UpdateApplicationRequest;
}

/**
 * Updates an application, then refetches it and any mounted application lists. Call
 * `mutate({applicationId, data})`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
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
