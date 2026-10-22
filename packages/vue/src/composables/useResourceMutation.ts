// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ApiFetcher, ResourceInvalidator, ResourceQueryKey} from '@thunderid/browser';
import {type Ref, readonly, ref, shallowRef} from 'vue';
import {resolveInvalidator, resolveManagementFetcher} from './useResourceQuery';
import useThunderID from './useThunderID';
import type {ThunderIDContext} from '../models/contexts';

/**
 * Options accepted by every management mutation composable.
 */
export interface ResourceMutationOptions<TData, TVariables> {
  /**
   * Transport for this composable only. Takes precedence over `ThunderIDProvider`'s `http.fetcher`.
   */
  fetcher?: ApiFetcher;
  /**
   * Called when the mutation fails.
   */
  onError?: (error: Error, variables: TVariables) => void;
  /**
   * Called when the mutation succeeds, after the affected queries have been invalidated.
   */
  onSuccess?: (data: TData, variables: TVariables) => void;
}

/**
 * State returned by a management mutation composable.
 */
export interface ResourceMutationResult<TData, TVariables> {
  data: Readonly<Ref<TData | undefined>>;
  error: Readonly<Ref<Error | null>>;
  isLoading: Readonly<Ref<boolean>>;
  /**
   * Runs the mutation. Never rejects: read `error`, or use `onError`, to handle a failure.
   */
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  /**
   * Runs the mutation and rejects if it fails.
   */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /**
   * Clears `data` and `error`.
   */
  reset: () => void;
}

/**
 * Runs a management mutation and invalidates the queries whose data it changed. Depends on no data
 * fetching library.
 *
 * @param mutationFn - Performs the request with the resolved fetcher.
 * @param getInvalidatedKeys - Returns the query key prefixes to invalidate after a success.
 * @param options - Mutation options.
 * @returns The mutation state.
 */
const useResourceMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables, fetcher: ApiFetcher) => Promise<TData>,
  getInvalidatedKeys: (variables: TVariables) => ResourceQueryKey[],
  {fetcher, onError, onSuccess}: ResourceMutationOptions<TData, TVariables> = {},
): ResourceMutationResult<TData, TVariables> => {
  const context: ThunderIDContext = useThunderID();
  const invalidator: ResourceInvalidator = resolveInvalidator(context);
  const resolvedFetcher: ApiFetcher = resolveManagementFetcher(context, fetcher);

  const data: Ref<TData | undefined> = shallowRef<TData | undefined>(undefined);
  const error: Ref<Error | null> = shallowRef<Error | null>(null);
  const isLoading: Ref<boolean> = ref<boolean>(false);

  const mutateAsync = async (variables: TVariables): Promise<TData> => {
    isLoading.value = true;
    error.value = null;

    try {
      const result: TData = await mutationFn(variables, resolvedFetcher);

      data.value = result;
      getInvalidatedKeys(variables).forEach((key: ResourceQueryKey) => {
        invalidator.invalidate(key);
      });
      onSuccess?.(result, variables);

      return result;
    } catch (err) {
      const mutationError: Error = err instanceof Error ? err : new Error(String(err));

      error.value = mutationError;
      onError?.(mutationError, variables);

      throw mutationError;
    } finally {
      isLoading.value = false;
    }
  };

  const mutate = (variables: TVariables): Promise<TData | undefined> =>
    mutateAsync(variables).catch((): undefined => undefined);

  const reset = (): void => {
    data.value = undefined;
    error.value = null;
  };

  return {
    data: readonly(data) as Readonly<Ref<TData | undefined>>,
    error: readonly(error) as Readonly<Ref<Error | null>>,
    isLoading: readonly(isLoading),
    mutate,
    mutateAsync,
    reset,
  };
};

export default useResourceMutation;
