// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type ApiFetcher,
  type ResourceInvalidator,
  type ResourceQueryKey,
  createHttpClientFetcher,
  fallbackResourceInvalidator,
} from '@thunderid/browser';
import {
  type MaybeRefOrGetter,
  type Ref,
  getCurrentScope,
  onScopeDispose,
  readonly,
  ref,
  shallowRef,
  toValue,
  watch,
} from 'vue';
import useThunderID from './useThunderID';
import type {ThunderIDContext} from '../models/contexts';

/**
 * Options accepted by every management query composable.
 */
export interface ResourceQueryOptions {
  /**
   * Set to `false` to skip fetching, for example until an identifier is known. Accepts a ref or a
   * getter, so fetching starts as soon as it turns `true`.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean | undefined>;
  /**
   * Transport for this composable only. Takes precedence over `ThunderIDProvider`'s `http.fetcher`.
   */
  fetcher?: ApiFetcher;
}

/**
 * State returned by a management query composable.
 */
export interface ResourceQueryResult<T> {
  data: Readonly<Ref<T | undefined>>;
  error: Readonly<Ref<Error | null>>;
  isLoading: Readonly<Ref<boolean>>;
  /**
   * Fetches the resource again. Resolves with the new data, or `undefined` if the request failed.
   */
  refetch: () => Promise<T | undefined>;
}

/**
 * Resolves the fetcher a management composable should use: its own, then the provider's, then the
 * SDK's authenticated HTTP client.
 *
 * @param context - The ThunderID context.
 * @param fetcher - The composable's own fetcher, if any.
 * @returns The fetcher to use.
 */
export const resolveManagementFetcher = (context: ThunderIDContext, fetcher?: ApiFetcher): ApiFetcher =>
  fetcher ?? context.http?.fetcher ?? createHttpClientFetcher(context.instanceId);

/**
 * Returns the invalidator management composables share.
 *
 * @param context - The ThunderID context.
 * @returns The provider's invalidator, or the shared fallback.
 */
export const resolveInvalidator = (context: ThunderIDContext): ResourceInvalidator =>
  context.invalidator ?? fallbackResourceInvalidator;

/**
 * Fetches a management resource and keeps it fresh. Depends on no data fetching library: the
 * request runs through the resolved fetcher, a change to the key or to `enabled` refetches, and a
 * matching mutation triggers a refetch.
 *
 * @param queryKey - Identifies the data. A getter, so a reactive identifier or page refetches.
 * @param queryFn - Performs the request with the resolved fetcher.
 * @param options - Query options.
 * @returns The query state.
 */
const useResourceQuery = <T>(
  queryKey: () => ResourceQueryKey,
  queryFn: (fetcher: ApiFetcher) => Promise<T>,
  {enabled, fetcher}: ResourceQueryOptions = {},
): ResourceQueryResult<T> => {
  const context: ThunderIDContext = useThunderID();
  const invalidator: ResourceInvalidator = resolveInvalidator(context);
  const resolvedFetcher: ApiFetcher = resolveManagementFetcher(context, fetcher);
  const isEnabled = (): boolean => toValue(enabled) !== false;

  const data: Ref<T | undefined> = shallowRef<T | undefined>(undefined);
  const error: Ref<Error | null> = shallowRef<Error | null>(null);
  const isLoading: Ref<boolean> = ref<boolean>(isEnabled());
  // Only the latest request may write state, so a slow earlier response cannot overwrite a newer one.
  let latestRequest = 0;
  let unsubscribe: (() => void) | undefined;

  const refetch = async (): Promise<T | undefined> => {
    latestRequest += 1;
    const requestId: number = latestRequest;

    isLoading.value = true;

    try {
      const result: T = await queryFn(resolvedFetcher);

      if (requestId === latestRequest) {
        data.value = result;
        error.value = null;
      }

      return result;
    } catch (err) {
      if (requestId === latestRequest) {
        error.value = err instanceof Error ? err : new Error(String(err));
      }

      return undefined;
    } finally {
      if (requestId === latestRequest) {
        isLoading.value = false;
      }
    }
  };

  watch(
    () => [JSON.stringify(queryKey()), isEnabled()] as const,
    ([serializedKey, active]: readonly [string, boolean]): void => {
      unsubscribe?.();
      unsubscribe = undefined;

      if (!active) {
        isLoading.value = false;

        return;
      }

      void refetch();
      unsubscribe = invalidator.subscribe(JSON.parse(serializedKey) as ResourceQueryKey, () => {
        void refetch();
      });
    },
    {immediate: true},
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe?.();
      // Drop any in-flight response.
      latestRequest += 1;
    });
  }

  return {
    data: readonly(data) as Readonly<Ref<T | undefined>>,
    error: readonly(error) as Readonly<Ref<Error | null>>,
    isLoading: readonly(isLoading),
    refetch,
  };
};

export default useResourceQuery;
