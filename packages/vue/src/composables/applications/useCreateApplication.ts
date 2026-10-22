// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ApplicationQueryKeys,
  createApplication,
  type Application,
  type CreateApplicationRequest,
} from '@thunderid/browser';
import useManagementEndpoint, {type ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {type ResourceMutationOptions, type ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates an application, then refetches any mounted application lists. Call `mutate(payload)`.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-composable `fetcher`.
 * @returns The mutation state.
 */
const useCreateApplication = (
  options?: ResourceMutationOptions<Application, CreateApplicationRequest>,
): ResourceMutationResult<Application, CreateApplicationRequest> => {
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');

  return useResourceMutation(
    (payload: CreateApplicationRequest, fetcher) => createApplication({...endpoint, fetcher, payload}),
    () => [[ApplicationQueryKeys.APPLICATIONS]],
    options,
  );
};

export default useCreateApplication;
