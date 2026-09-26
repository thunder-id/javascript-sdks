// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFetcher} from '@thunderid/browser';
import {useCallback, useRef, useState} from 'react';
import {useResolvedFetcher} from './useResourceQuery';
import useThunderID from '../contexts/ThunderID/useThunderID';
import {ResourceQueryKey, fallbackResourceInvalidator} from '../utils/createResourceInvalidator';

/**
 * Options accepted by every management mutation hook.
 */
export interface ResourceMutationOptions<TData, TVariables> {
  /**
   * Transport for this hook only. Takes precedence over `ThunderIDProvider`'s `http.fetcher`.
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
 * State returned by a management mutation hook.
 */
export interface ResourceMutationResult<TData, TVariables> {
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean;
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
  const {invalidator = fallbackResourceInvalidator} = useThunderID();
  const resolvedFetcher: ApiFetcher = useResolvedFetcher(fetcher);
  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const callbacksRef: {
    current: {
      getInvalidatedKeys: typeof getInvalidatedKeys;
      mutationFn: typeof mutationFn;
      onError?: ResourceMutationOptions<TData, TVariables>['onError'];
      onSuccess?: ResourceMutationOptions<TData, TVariables>['onSuccess'];
    };
  } = useRef({getInvalidatedKeys, mutationFn, onError, onSuccess});
  callbacksRef.current = {getInvalidatedKeys, mutationFn, onError, onSuccess};

  const mutateAsync: (variables: TVariables) => Promise<TData> = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);

      try {
        const result: TData = await callbacksRef.current.mutationFn(variables, resolvedFetcher);

        setData(result);
        callbacksRef.current.getInvalidatedKeys(variables).forEach((key: ResourceQueryKey) => {
          invalidator.invalidate(key);
        });
        callbacksRef.current.onSuccess?.(result, variables);

        return result;
      } catch (err) {
        const mutationError: Error = err instanceof Error ? err : new Error(String(err));

        setError(mutationError);
        callbacksRef.current.onError?.(mutationError, variables);

        throw mutationError;
      } finally {
        setIsLoading(false);
      }
    },
    [invalidator, resolvedFetcher],
  );

  const mutate: (variables: TVariables) => Promise<TData | undefined> = useCallback(
    (variables: TVariables): Promise<TData | undefined> => mutateAsync(variables).catch((): undefined => undefined),
    [mutateAsync],
  );

  const reset: () => void = useCallback((): void => {
    setData(undefined);
    setError(null);
  }, []);

  return {data, error, isLoading, mutate, mutateAsync, reset};
};

export default useResourceMutation;
