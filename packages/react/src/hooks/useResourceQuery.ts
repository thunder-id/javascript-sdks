// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ApiFetcher} from '@thunderid/browser';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import useThunderID from '../contexts/ThunderID/useThunderID';
import createAuthenticatedFetcher from '../utils/createAuthenticatedFetcher';
import {ResourceQueryKey, fallbackResourceInvalidator} from '../utils/createResourceInvalidator';

/**
 * Options accepted by every management query hook.
 */
export interface ResourceQueryOptions {
  /**
   * Set to `false` to skip fetching, for example until an identifier is known.
   * @default true
   */
  enabled?: boolean;
  /**
   * Transport for this hook only. Takes precedence over `ThunderIDProvider`'s `http.fetcher`.
   */
  fetcher?: ApiFetcher;
}

/**
 * State returned by a management query hook.
 */
export interface ResourceQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  /**
   * Fetches the resource again. Resolves with the new data, or `undefined` if the request failed.
   */
  refetch: () => Promise<T | undefined>;
}

/**
 * Resolves the fetcher a management hook should use: the hook's own, then the provider's, then the
 * SDK's authenticated HTTP client.
 */
export const useResolvedFetcher = (fetcher?: ApiFetcher): ApiFetcher => {
  const {http, instanceId} = useThunderID();
  const providerFetcher: ApiFetcher | undefined = http?.fetcher;

  return useMemo(
    () => fetcher ?? providerFetcher ?? createAuthenticatedFetcher(instanceId),
    [fetcher, providerFetcher, instanceId],
  );
};

/**
 * Fetches a management resource and keeps it fresh. Depends on no data fetching library: the
 * request runs through the resolved fetcher, and a matching mutation triggers a refetch.
 *
 * @param queryKey - Identifies the data. Changing it refetches; mutations invalidate by key prefix.
 * @param queryFn - Performs the request with the resolved fetcher.
 * @param options - Query options.
 * @returns The query state.
 */
const useResourceQuery = <T>(
  queryKey: ResourceQueryKey,
  queryFn: (fetcher: ApiFetcher) => Promise<T>,
  {enabled = true, fetcher}: ResourceQueryOptions = {},
): ResourceQueryResult<T> => {
  const {invalidator = fallbackResourceInvalidator} = useThunderID();
  const resolvedFetcher: ApiFetcher = useResolvedFetcher(fetcher);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);

  const serializedKey: string = JSON.stringify(queryKey);
  const queryFnRef: {current: (fetcher: ApiFetcher) => Promise<T>} = useRef(queryFn);
  queryFnRef.current = queryFn;
  // Only the latest request may write state, so a slow earlier response cannot overwrite a newer one.
  const latestRequestRef: {current: number} = useRef(0);

  const refetch: () => Promise<T | undefined> = useCallback(async (): Promise<T | undefined> => {
    latestRequestRef.current += 1;
    const requestId: number = latestRequestRef.current;

    setIsLoading(true);

    try {
      const result: T = await queryFnRef.current(resolvedFetcher);

      if (requestId === latestRequestRef.current) {
        setData(result);
        setError(null);
      }

      return result;
    } catch (err) {
      if (requestId === latestRequestRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }

      return undefined;
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [resolvedFetcher]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);

      return undefined;
    }

    void refetch();

    return invalidator.subscribe(JSON.parse(serializedKey) as ResourceQueryKey, () => {
      void refetch();
    });
  }, [enabled, invalidator, refetch, serializedKey]);

  return {data, error, isLoading, refetch};
};

export default useResourceQuery;
