// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Application, ApplicationQueryKeys, CreateApplicationRequest, createApplication} from '@thunderid/browser';
import useManagementEndpoint, {ManagementEndpoint} from '../useManagementEndpoint';
import useResourceMutation, {ResourceMutationOptions, ResourceMutationResult} from '../useResourceMutation';

/**
 * Creates an application, then refetches any mounted application lists.
 *
 * @param options - Mutation options, including `onSuccess`, `onError`, and a per-hook `fetcher`.
 * @returns The mutation state. Call `mutate(payload)` to create.
 *
 * @example
 * ```tsx
 * const {mutate, isLoading, error} = useCreateApplication({onSuccess: app => navigate(app.id)});
 * ```
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
