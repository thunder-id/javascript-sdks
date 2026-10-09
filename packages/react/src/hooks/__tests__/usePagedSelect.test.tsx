// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, renderHook, waitFor} from '@testing-library/react';
import {ThunderIDAPIError} from '@thunderid/browser';
import type {FetchPagedOptions, PagedSelectPage, PagedSelectRequest} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import usePagedSelect from '../usePagedSelect';

const page = (start: number, count: number, totalResults: number): PagedSelectPage => ({
  nextOffset: start + count < totalResults ? start + count : null,
  options: Array.from({length: count}, (_, index) => ({
    label: `User ${start + index + 1}`,
    value: `user-${start + index + 1}`,
  })),
  totalResults,
});

describe('usePagedSelect', () => {
  afterEach(() => {
    cleanup();
  });

  it('makes no request until loadInitial is called', () => {
    const fetchOptions: FetchPagedOptions = vi.fn();
    renderHook(() => usePagedSelect({fetchOptions}));

    expect(fetchOptions).not.toHaveBeenCalled();
  });

  it('never requests anything while fetchOptions is unset', () => {
    const {result} = renderHook(() => usePagedSelect({}));

    act(() => result.current.loadInitial());

    expect(result.current.options).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('loads the first page once, and ignores repeated loadInitial calls', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue(page(0, 30, 75));
    const {result} = renderHook(() => usePagedSelect({fetchOptions}));

    act(() => {
      result.current.loadInitial();
      result.current.loadInitial();
    });
    await waitFor(() => expect(result.current.options).toHaveLength(30));
    act(() => result.current.loadInitial());

    expect(fetchOptions).toHaveBeenCalledTimes(1);
    expect(fetchOptions).toHaveBeenCalledWith(expect.objectContaining({limit: 30, offset: 0}));
    expect(result.current.hasMore).toBe(true);
  });

  it('appends following pages, de-duplicates, and stops at the end', async () => {
    const fetchOptions: FetchPagedOptions = vi
      .fn()
      .mockResolvedValueOnce(page(0, 30, 45))
      .mockResolvedValueOnce({...page(29, 16, 45), nextOffset: null});
    const {result} = renderHook(() => usePagedSelect({fetchOptions}));

    act(() => result.current.loadInitial());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.options).toHaveLength(45));

    expect(result.current.hasMore).toBe(false);
    act(() => result.current.loadMore());
    expect(fetchOptions).toHaveBeenCalledTimes(2);
  });

  it('does not start a second request while one is in flight', async () => {
    let resolveFirst: (value: PagedSelectPage) => void = () => undefined;
    const fetchOptions: FetchPagedOptions = vi.fn().mockImplementation(
      () =>
        new Promise<PagedSelectPage>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const {result} = renderHook(() => usePagedSelect({fetchOptions}));

    act(() => result.current.loadInitial());
    act(() => result.current.loadMore());
    expect(fetchOptions).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst(page(0, 5, 5));
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
  });

  it('treats a non-advancing nextOffset as the end of the list', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockResolvedValue({...page(0, 5, 100), nextOffset: 0});
    const {result} = renderHook(() => usePagedSelect({fetchOptions}));

    act(() => result.current.loadInitial());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    expect(result.current.hasMore).toBe(false);
  });

  it('retries the page that failed, keeping already-loaded options on a next-page failure', async () => {
    const fetchOptions: FetchPagedOptions = vi
      .fn()
      .mockResolvedValueOnce(page(0, 30, 60))
      .mockRejectedValueOnce(new ThunderIDAPIError('Upstream exploded', 'test-code', 'test-origin', 500))
      .mockResolvedValueOnce(page(30, 30, 60));
    const {result} = renderHook(() => usePagedSelect({fetchOptions}));

    act(() => result.current.loadInitial());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.error?.message).toBe('Upstream exploded'));
    expect(result.current.options).toHaveLength(30);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.options).toHaveLength(60));
    expect(fetchOptions).toHaveBeenNthCalledWith(3, expect.objectContaining({offset: 30}));
    expect(result.current.error).toBeNull();
  });

  it('does not trust a plain Error, falling back to the generic translatable key', async () => {
    const fetchOptions: FetchPagedOptions = vi.fn().mockRejectedValueOnce(new Error('a raw exception message'));
    const {result} = renderHook(() => usePagedSelect({fetchOptions}));

    act(() => result.current.loadInitial());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBeUndefined();
    expect(result.current.error?.messageKey).toBe('elements.fields.paged_select.load_error');
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
    const {result} = renderHook(() => usePagedSelect({fetchOptions}));

    act(() => result.current.loadInitial());
    act(() => result.current.abort());

    expect(signal?.aborted).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);

    act(() => result.current.loadInitial());
    await waitFor(() => expect(result.current.options).toHaveLength(3));
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
    const {result, rerender} = renderHook(({filter}) => usePagedSelect({fetchOptions, filter}), {
      initialProps: {filter: 'department eq "A"'},
    });

    act(() => result.current.loadInitial());
    rerender({filter: 'department eq "B"'});
    await act(async () => {
      resolveStale(page(0, 30, 30));
      await Promise.resolve();
    });

    expect(result.current.options).toEqual([]);

    act(() => result.current.loadInitial());
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(fetchOptions).toHaveBeenLastCalledWith(expect.objectContaining({filter: 'department eq "B"', offset: 0}));
  });

  describe('mapping raw items into options', () => {
    it('uses a plain list of strings for both label and value, with no mapping', async () => {
      const fetchOptions: FetchPagedOptions = vi
        .fn()
        .mockResolvedValue({items: ['alice@example.com', 'bob@example.com'], nextOffset: null});
      const {result} = renderHook(() => usePagedSelect({fetchOptions}));

      act(() => result.current.loadInitial());
      await waitFor(() => expect(result.current.hasLoaded).toBe(true));

      expect(result.current.options).toEqual([
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
      const {result} = renderHook(() => usePagedSelect({fetchOptions, mapping}));

      act(() => result.current.loadInitial());
      await waitFor(() => expect(result.current.hasLoaded).toBe(true));

      expect(result.current.options).toEqual([
        {label: 'Alice Example', value: 'alice@example.com'},
        {label: 'Bob Example', value: 'bob@example.com'},
      ]);
    });

    it('falls back to the first text field for both when objects have no id and nothing is configured', async () => {
      const fetchOptions: FetchPagedOptions = vi
        .fn()
        .mockResolvedValue({items: [{name: 'Alice', city: 'Colombo'}], nextOffset: null});
      const {result} = renderHook(() => usePagedSelect({fetchOptions}));

      act(() => result.current.loadInitial());
      await waitFor(() => expect(result.current.hasLoaded).toBe(true));

      expect(result.current.options).toEqual([{label: 'Alice', value: 'Alice'}]);
    });

    it('prefers ready-made options over raw items when a page returns both', async () => {
      const fetchOptions: FetchPagedOptions = vi
        .fn()
        .mockResolvedValue({items: ['ignored'], nextOffset: null, options: [{label: 'Kept', value: 'kept'}]});
      const {result} = renderHook(() => usePagedSelect({fetchOptions}));

      act(() => result.current.loadInitial());
      await waitFor(() => expect(result.current.hasLoaded).toBe(true));

      expect(result.current.options).toEqual([{label: 'Kept', value: 'kept'}]);
    });
  });
});
