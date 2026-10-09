// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/browser';
import type {FetchPagedOptions, PagedSelectPage, PagedSelectRequest} from '@thunderid/browser';
import {mount} from '@vue/test-utils';
import {describe, expect, it, vi} from 'vitest';
import {defineComponent, h, reactive} from 'vue';
import usePagedSelect, {type UsePagedSelectOptions, type UsePagedSelectResult} from '../../composables/usePagedSelect';

const page = (start: number, count: number, totalResults: number): PagedSelectPage => ({
  nextOffset: start + count < totalResults ? start + count : null,
  options: Array.from({length: count}, (_, index) => ({
    label: `User ${start + index + 1}`,
    value: `user-${start + index + 1}`,
  })),
  totalResults,
});

/**
 * Mounts `usePagedSelect` in a minimal host component so lifecycle hooks have an instance.
 * The options are `reactive`, so mutating `filter`/`fetchOptions` after mounting reaches the composable's watch.
 */
function setup(options: UsePagedSelectOptions): {
  reactiveOptions: UsePagedSelectOptions;
  result: UsePagedSelectResult;
  wrapper: ReturnType<typeof mount>;
} {
  let result!: UsePagedSelectResult;
  const reactiveOptions = reactive(options) as UsePagedSelectOptions;
  const TestChild = defineComponent({
    setup() {
      result = usePagedSelect(reactiveOptions);
      return () => h('div');
    },
  });
  const wrapper = mount(TestChild);
  return {reactiveOptions, result, wrapper};
}

describe('usePagedSelect (vue)', () => {
  it('makes no request until loadInitial is called', () => {
    const fetchOptions: FetchPagedOptions = vi.fn();
    setup({fetchOptions});

    expect(fetchOptions).not.toHaveBeenCalled();
  });

  it('never requests anything while fetchOptions is unset', () => {
    const {result} = setup({});

    result.loadInitial();

    expect(result.options.value).toEqual([]);
    expect(result.isLoading.value).toBe(false);
  });

  it('loads the first page once, and ignores repeated loadInitial calls', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue(page(0, 30, 75));
    const {result} = setup({fetchOptions});

    result.loadInitial();
    result.loadInitial();
    await vi.waitFor(() => expect(result.options.value).toHaveLength(30));
    result.loadInitial();

    expect(fetchOptions).toHaveBeenCalledTimes(1);
    expect(fetchOptions).toHaveBeenCalledWith(expect.objectContaining({limit: 30, offset: 0}));
    expect(result.hasMore.value).toBe(true);
  });

  it('appends following pages, de-duplicates, and stops at the end', async () => {
    const fetchOptions: FetchPagedOptions = vi
      .fn()
      .mockResolvedValueOnce(page(0, 30, 45))
      .mockResolvedValueOnce({...page(29, 16, 45), nextOffset: null});
    const {result} = setup({fetchOptions});

    result.loadInitial();
    await vi.waitFor(() => expect(result.hasLoaded.value).toBe(true));
    result.loadMore();
    await vi.waitFor(() => expect(result.options.value).toHaveLength(45));

    expect(result.hasMore.value).toBe(false);
    result.loadMore();
    expect(fetchOptions).toHaveBeenCalledTimes(2);
  });

  it('treats a non-advancing nextOffset as the end of the list', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue({...page(0, 5, 100), nextOffset: 0});
    const {result} = setup({fetchOptions});

    result.loadInitial();
    await vi.waitFor(() => expect(result.hasLoaded.value).toBe(true));

    expect(result.hasMore.value).toBe(false);
  });

  it('retries the page that failed, keeping already-loaded options on a next-page failure', async () => {
    const fetchOptions: FetchPagedOptions = vi
      .fn()
      .mockResolvedValueOnce(page(0, 30, 60))
      .mockRejectedValueOnce(new ThunderIDAPIError('Upstream exploded', 'test-code', 'test-origin', 500))
      .mockResolvedValueOnce(page(30, 30, 60));
    const {result} = setup({fetchOptions});

    result.loadInitial();
    await vi.waitFor(() => expect(result.hasLoaded.value).toBe(true));
    result.loadMore();
    await vi.waitFor(() => expect(result.error.value?.message).toBe('Upstream exploded'));
    expect(result.options.value).toHaveLength(30);

    result.retry();
    await vi.waitFor(() => expect(result.options.value).toHaveLength(60));
    expect(fetchOptions).toHaveBeenNthCalledWith(3, expect.objectContaining({offset: 30}));
    expect(result.error.value).toBeNull();
  });

  it('does not trust a plain Error, falling back to the generic translatable key', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockRejectedValueOnce(new Error('a raw exception message'));
    const {result} = setup({fetchOptions});

    result.loadInitial();

    await vi.waitFor(() => expect(result.error.value).not.toBeNull());
    expect(result.error.value?.message).toBeUndefined();
    expect(result.error.value?.messageKey).toBe('elements.fields.paged_select.load_error');
  });

  it('aborts the in-flight request on abort() without surfacing an error, and allows reloading', async () => {
    let signal: AbortSignal | undefined;
    const fetchOptions: FetchPagedOptions = vi
      .fn()
      .mockImplementationOnce(
        (request: PagedSelectRequest) =>
          new Promise<PagedSelectPage>((_resolve, reject) => {
            signal = request.signal;
            request.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      )
      .mockResolvedValueOnce(page(0, 3, 3));
    const {result} = setup({fetchOptions});

    result.loadInitial();
    result.abort();

    expect(signal?.aborted).toBe(true);
    expect(result.error.value).toBeNull();
    expect(result.isLoading.value).toBe(false);

    result.loadInitial();
    await vi.waitFor(() => expect(result.options.value).toHaveLength(3));
  });

  it('resets loaded pages and ignores stale results when the filter changes', async () => {
    let resolveStale: (value: PagedSelectPage) => void = () => undefined;
    const fetchOptions: FetchPagedOptions = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<PagedSelectPage>((resolve) => {
            resolveStale = resolve;
          }),
      )
      .mockResolvedValueOnce(page(100, 2, 2));
    const {reactiveOptions, result} = setup({fetchOptions, filter: 'department eq "A"'});

    result.loadInitial();
    reactiveOptions.filter = 'department eq "B"';
    resolveStale(page(0, 30, 30));
    await Promise.resolve();
    await Promise.resolve();

    expect(result.options.value).toEqual([]);

    result.loadInitial();
    await vi.waitFor(() => expect(result.options.value).toHaveLength(2));
    expect(fetchOptions).toHaveBeenLastCalledWith(expect.objectContaining({filter: 'department eq "B"', offset: 0}));
  });

  describe('mapping raw items into options', () => {
    it('uses a plain list of strings for both label and value, with no mapping', async () => {
      const fetchOptions: FetchPagedOptions = vi
        .fn()
        .mockResolvedValue({items: ['alice@example.com', 'bob@example.com'], nextOffset: null});
      const {result} = setup({fetchOptions});

      result.loadInitial();
      await vi.waitFor(() => expect(result.hasLoaded.value).toBe(true));

      expect(result.options.value).toEqual([
        {label: 'alice@example.com', value: 'alice@example.com'},
        {label: 'bob@example.com', value: 'bob@example.com'},
      ]);
    });

    it('applies the configured label and value fields to an array of objects', async () => {
      const items = [
        {email: 'alice@example.com', fullName: 'Alice Example', id: 'u1'},
        {email: 'bob@example.com', fullName: 'Bob Example', id: 'u2'},
      ];
      const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue({items, nextOffset: null});
      const mapping = {labelAttributes: ['fullName'], valueAttribute: 'email'};
      const {result} = setup({fetchOptions, mapping});

      result.loadInitial();
      await vi.waitFor(() => expect(result.hasLoaded.value).toBe(true));

      expect(result.options.value).toEqual([
        {label: 'Alice Example', value: 'alice@example.com'},
        {label: 'Bob Example', value: 'bob@example.com'},
      ]);
    });

    it('prefers ready-made options over raw items when a page returns both', async () => {
      const fetchOptions: FetchPagedOptions = vi
        .fn()
        .mockResolvedValue({items: ['ignored'], nextOffset: null, options: [{label: 'Kept', value: 'kept'}]});
      const {result} = setup({fetchOptions});

      result.loadInitial();
      await vi.waitFor(() => expect(result.hasLoaded.value).toBe(true));

      expect(result.options.value).toEqual([{label: 'Kept', value: 'kept'}]);
    });
  });
});
