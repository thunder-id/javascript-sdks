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
import {computed, onUnmounted, ref, shallowRef, watch, type ComputedRef, type Ref} from 'vue';

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
  error: Ref<PagedSelectErrorResult | null>;
  hasLoaded: Ref<boolean>;
  hasMore: Ref<boolean>;
  isLoading: Ref<boolean>;
  isLoadingMore: Ref<boolean>;
  loadInitial: () => void;
  loadMore: () => void;
  options: Ref<PagedSelectOption[]>;
  retry: () => void;
}

/**
 * Loads options page by page from `props.fetchOptions`: lazy first page, de-duplication, cancellation, and a generation guard that drops results from a superseded scope (filter, field, or loader change). Vue counterpart of the React `usePagedSelect`.
 *
 * `props` is read live, so prop changes are picked up without passing refs.
 */
const usePagedSelect = (props: UsePagedSelectOptions): UsePagedSelectResult => {
  const effectiveComponent: ComputedRef<EmbeddedFlowComponent> = computed(
    () =>
      props.component ??
      ({id: props.fieldId ?? 'paged-select', type: EmbeddedFlowComponentType.Select} as EmbeddedFlowComponent),
  );

  const options: Ref<PagedSelectOption[]> = ref([]) as Ref<PagedSelectOption[]>;
  const hasMore: Ref<boolean> = ref(true);
  const hasLoaded: Ref<boolean> = ref(false);
  const isLoading: Ref<boolean> = ref(false);
  const isLoadingMore: Ref<boolean> = ref(false);
  const error: Ref<PagedSelectErrorResult | null> = shallowRef(null);

  // Plain closure state (not refs): never read during render, only coordinates loading.
  let generation = 0;
  let abortController: AbortController | null = null;
  let inFlight = false;
  let hasLoadedInternal = false;
  let nextOffset: number | null = 0;
  let failedOffset = 0;

  const abort = (): void => {
    abortController?.abort();
    abortController = null;
    inFlight = false;
    isLoading.value = false;
    isLoadingMore.value = false;
  };

  const resetPaging = (): void => {
    generation += 1;
    hasLoadedInternal = false;
    nextOffset = 0;
    failedOffset = 0;
    abort();
    options.value = [];
    hasMore.value = true;
    hasLoaded.value = false;
    error.value = null;
  };

  const loadPage = async (pageOffset: number): Promise<void> => {
    const fetchOptionsFn: FetchPagedOptions | undefined = props.fetchOptions;
    if (!fetchOptionsFn) {
      return;
    }

    const thisGeneration: number = generation;
    const isFirstPage: boolean = pageOffset === 0;

    abortController?.abort();
    const controller: AbortController = new AbortController();
    abortController = controller;
    inFlight = true;

    if (isFirstPage) {
      isLoading.value = true;
    } else {
      isLoadingMore.value = true;
    }
    error.value = null;

    try {
      const page = await fetchOptionsFn({
        component: effectiveComponent.value,
        filter: props.filter,
        limit: props.pageSize ?? DEFAULT_PAGE_SIZE,
        offset: pageOffset,
        signal: controller.signal,
      });

      if (thisGeneration !== generation || controller.signal.aborted) {
        return;
      }

      const next: number | null = isAdvancingPageOffset(pageOffset, page.nextOffset) ? page.nextOffset : null;
      const pageOptions: PagedSelectOption[] =
        page.options ?? toPagedSelectOptions(page.items ?? [], props.mapping, props.defaults);

      options.value = dedupePagedSelectOptions(isFirstPage ? [] : options.value, pageOptions);
      nextOffset = next;
      hasMore.value = next !== null;
      hasLoadedInternal = true;
      hasLoaded.value = true;
    } catch (err) {
      if (thisGeneration !== generation || controller.signal.aborted) {
        return;
      }
      failedOffset = pageOffset;
      error.value = mapPagedSelectError(err);
    } finally {
      if (abortController === controller) {
        abortController = null;
        inFlight = false;
        isLoading.value = false;
        isLoadingMore.value = false;
      }
    }
  };

  const loadInitial = (): void => {
    if (!props.fetchOptions || hasLoadedInternal || inFlight) {
      return;
    }
    void loadPage(0);
  };

  const loadMore = (): void => {
    if (nextOffset === null || inFlight || !hasLoadedInternal) {
      return;
    }
    void loadPage(nextOffset);
  };

  const retry = (): void => {
    if (inFlight) {
      return;
    }
    void loadPage(failedOffset);
  };

  watch(() => [effectiveComponent.value.id, props.filter, props.fetchOptions] as const, resetPaging);

  onUnmounted(abort);

  return {abort, error, hasLoaded, hasMore, isLoading, isLoadingMore, loadInitial, loadMore, options, retry};
};

export default usePagedSelect;
