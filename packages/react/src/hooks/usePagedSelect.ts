// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  dedupePagedSelectOptions,
  EmbeddedFlowComponentType,
  isAdvancingPageOffset,
  mapPagedSelectError,
  toPagedSelectOptions,
} from '@thunderid/browser';
import type {
  EmbeddedFlowComponent,
  FetchPagedOptions,
  PagedSelectErrorResult,
  PagedSelectOption,
  PagedSelectOptionDefaults,
  PagedSelectOptionMapping,
} from '@thunderid/browser';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

const DEFAULT_PAGE_SIZE = 30;

export interface UsePagedSelectOptions {
  component?: EmbeddedFlowComponent;
  defaults?: PagedSelectOptionDefaults;
  fetchOptions?: FetchPagedOptions;
  fieldId?: string;
  filter?: string;
  /** Read when a page loads; changing it does not re-map options that are already loaded. */
  mapping?: PagedSelectOptionMapping;
  pageSize?: number;
}

export interface UsePagedSelectResult {
  abort: () => void;
  error: PagedSelectErrorResult | null;
  hasLoaded: boolean;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadInitial: () => void;
  loadMore: () => void;
  options: PagedSelectOption[];
  retry: () => void;
}

/**
 * Loads options page by page from `fetchOptions`: lazy first page, incremental paging,
 * de-duplication, cancellation, and a generation guard that drops results from a superseded
 * scope (filter, field, or loader change). Renders nothing itself, so any design system can use it.
 */
const usePagedSelect = ({
  component,
  defaults,
  fetchOptions,
  fieldId = 'paged-select',
  filter,
  mapping,
  pageSize = DEFAULT_PAGE_SIZE,
}: UsePagedSelectOptions): UsePagedSelectResult => {
  const effectiveComponent: EmbeddedFlowComponent = useMemo(
    () => component ?? ({id: fieldId, type: EmbeddedFlowComponentType.Select} as EmbeddedFlowComponent),
    [component, fieldId],
  );

  const [options, setOptions] = useState<PagedSelectOption[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<PagedSelectErrorResult | null>(null);

  const generationRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const hasLoadedRef = useRef<boolean>(false);
  const nextOffsetRef = useRef<number | null>(0);
  const failedOffsetRef = useRef<number>(0);

  const abort = useCallback((): void => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    inFlightRef.current = false;
    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  const resetPaging = useCallback((): void => {
    generationRef.current += 1;
    hasLoadedRef.current = false;
    nextOffsetRef.current = 0;
    failedOffsetRef.current = 0;
    abort();
    setOptions([]);
    setHasMore(true);
    setHasLoaded(false);
    setError(null);
  }, [abort]);

  useEffect(() => {
    resetPaging();
  }, [effectiveComponent.id, filter, fetchOptions, resetPaging]);

  useEffect(() => abort, [abort]);

  const loadPage = useCallback(
    async (pageOffset: number): Promise<void> => {
      if (!fetchOptions) {
        return;
      }

      const generation: number = generationRef.current;
      const isFirstPage: boolean = pageOffset === 0;

      abortControllerRef.current?.abort();
      const controller: AbortController = new AbortController();
      abortControllerRef.current = controller;
      inFlightRef.current = true;

      if (isFirstPage) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const page = await fetchOptions({
          component: effectiveComponent,
          filter,
          limit: pageSize,
          offset: pageOffset,
          signal: controller.signal,
        });

        if (generation !== generationRef.current || controller.signal.aborted) {
          return;
        }

        const next: number | null = isAdvancingPageOffset(pageOffset, page.nextOffset) ? page.nextOffset : null;
        const pageOptions: PagedSelectOption[] =
          page.options ?? toPagedSelectOptions(page.items ?? [], mapping, defaults);

        setOptions((existing: PagedSelectOption[]) =>
          dedupePagedSelectOptions(isFirstPage ? [] : existing, pageOptions),
        );
        nextOffsetRef.current = next;
        setHasMore(next !== null);
        hasLoadedRef.current = true;
        setHasLoaded(true);
      } catch (err) {
        if (generation !== generationRef.current || controller.signal.aborted) {
          return;
        }
        failedOffsetRef.current = pageOffset;
        setError(mapPagedSelectError(err));
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          inFlightRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [defaults, effectiveComponent, fetchOptions, filter, mapping, pageSize],
  );

  const loadInitial = useCallback((): void => {
    if (!fetchOptions || hasLoadedRef.current || inFlightRef.current) {
      return;
    }
    void loadPage(0);
  }, [fetchOptions, loadPage]);

  const loadMore = useCallback((): void => {
    if (nextOffsetRef.current === null || inFlightRef.current || !hasLoadedRef.current) {
      return;
    }
    void loadPage(nextOffsetRef.current);
  }, [loadPage]);

  const retry = useCallback((): void => {
    if (inFlightRef.current) {
      return;
    }
    void loadPage(failedOffsetRef.current);
  }, [loadPage]);

  return {abort, error, hasLoaded, hasMore, isLoading, isLoadingMore, loadInitial, loadMore, options, retry};
};

export default usePagedSelect;
