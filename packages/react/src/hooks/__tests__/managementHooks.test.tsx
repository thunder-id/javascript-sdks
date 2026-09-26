// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, renderHook, waitFor} from '@testing-library/react';
import {ApiFetcher} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import {afterEach, describe, expect, it, vi, type Mock} from 'vitest';
import ThunderIDContext, {ThunderIDContextProps} from '../../contexts/ThunderID/ThunderIDContext';
import createResourceInvalidator from '../../utils/createResourceInvalidator';
import useDeleteAgent from '../agents/useDeleteAgent';
import useCreateApplication from '../applications/useCreateApplication';
import useGetApplication from '../applications/useGetApplication';
import useGetApplications from '../applications/useGetApplications';
import useUpdateApplication from '../applications/useUpdateApplication';
import useGetUsers from '../users/useGetUsers';

type FetcherMock = Mock<ApiFetcher>;

const baseUrl = 'https://localhost:8090';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

const createFetcher = (body: unknown = {}, status = 200): FetcherMock =>
  vi.fn<ApiFetcher>().mockImplementation(() => Promise.resolve(jsonResponse(body, status)));

const createWrapper = ({
  fetcher,
  ...overrides
}: Partial<ThunderIDContextProps> & {fetcher?: ApiFetcher} = {}): ((props: {children: ReactNode}) => ReactElement) => {
  const value = {
    baseUrl,
    endpoints: undefined,
    http: {fetcher},
    instanceId: 0,
    invalidator: createResourceInvalidator(),
    ...overrides,
  } as unknown as ThunderIDContextProps;

  function Wrapper({children}: {children: ReactNode}): ReactElement {
    return <ThunderIDContext.Provider value={value}>{children}</ThunderIDContext.Provider>;
  }

  return Wrapper;
};

afterEach(() => {
  cleanup();
});

describe('management query hooks', () => {
  it('loads data through the provider fetcher', async () => {
    const page = {applications: [{id: 'app-1', name: 'App'}], count: 1, totalResults: 1};
    const fetcher: FetcherMock = createFetcher(page);

    const {result} = renderHook(() => useGetApplications({limit: 10}), {wrapper: createWrapper({fetcher})});

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(page);
    expect(result.current.error).toBeNull();
    expect(fetcher.mock.calls[0][0]).toBe(`${baseUrl}/applications?limit=10`);
  });

  it('prefers a per-hook fetcher over the provider fetcher', async () => {
    const providerFetcher: FetcherMock = createFetcher();
    const hookFetcher: FetcherMock = createFetcher({count: 0, startIndex: 1, totalResults: 0, users: []});

    const {result} = renderHook(() => useGetUsers({}, {fetcher: hookFetcher}), {
      wrapper: createWrapper({fetcher: providerFetcher}),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(hookFetcher).toHaveBeenCalledOnce();
    expect(providerFetcher).not.toHaveBeenCalled();
  });

  it('targets the endpoints override when the provider sets one', async () => {
    const fetcher: FetcherMock = createFetcher({id: 'app-1'});

    const {result} = renderHook(() => useGetApplication('app-1'), {
      wrapper: createWrapper({endpoints: {applications: 'https://rs.example.com/applications'}, fetcher}),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher.mock.calls[0][0]).toBe('https://rs.example.com/applications/app-1');
  });

  it('exposes a failed request as an error with a distinct code', async () => {
    const fetcher: FetcherMock = createFetcher({}, 404);

    const {result} = renderHook(() => useGetApplication('missing'), {wrapper: createWrapper({fetcher})});

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toMatchObject({code: 'getApplication-NotFoundError-001'});
    expect(result.current.data).toBeUndefined();
  });

  it('does not fetch a single resource until its identifier is known', () => {
    const fetcher: FetcherMock = createFetcher();

    const {result} = renderHook(() => useGetApplication(undefined), {wrapper: createWrapper({fetcher})});

    expect(result.current.isLoading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('management mutation hooks', () => {
  it('refetches matching queries after a successful mutation and calls onSuccess', async () => {
    const fetcher: FetcherMock = createFetcher({applications: [], count: 0, id: 'app-1', totalResults: 0});
    const onSuccess: Mock = vi.fn();
    const wrapper = createWrapper({fetcher});

    const {result} = renderHook(
      () => ({
        detail: useGetApplication('app-1'),
        list: useGetApplications(),
        otherDetail: useGetApplication('app-2'),
        update: useUpdateApplication({onSuccess}),
      }),
      {wrapper},
    );

    await waitFor(() => expect(result.current.list.isLoading).toBe(false));
    await waitFor(() => expect(result.current.otherDetail.isLoading).toBe(false));
    fetcher.mockClear();

    await act(async () => {
      await result.current.update.mutate({applicationId: 'app-1', data: {name: 'Renamed'}});
    });

    const urls: string[] = fetcher.mock.calls.map(([url]: [string, RequestInit]) => url);
    expect(urls).toContain(`${baseUrl}/applications/app-1`);
    expect(urls).toContain(`${baseUrl}/applications`);
    expect(urls).not.toContain(`${baseUrl}/applications/app-2`);
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({id: 'app-1'}), {
      applicationId: 'app-1',
      data: {name: 'Renamed'},
    });
  });

  it('never rejects from mutate, but rejects from mutateAsync', async () => {
    const fetcher: FetcherMock = createFetcher({}, 404);
    const onError: Mock = vi.fn();

    const {result} = renderHook(() => useDeleteAgent({onError}), {wrapper: createWrapper({fetcher})});

    await act(async () => {
      await expect(result.current.mutate('ag-1')).resolves.toBeUndefined();
    });
    expect(result.current.error).toMatchObject({code: 'deleteAgent-NotFoundError-001'});
    expect(onError).toHaveBeenCalledOnce();

    await act(async () => {
      await expect(result.current.mutateAsync('ag-1')).rejects.toMatchObject({code: 'deleteAgent-NotFoundError-001'});
    });

    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });

  it('sends the create payload through the resolved fetcher', async () => {
    const fetcher: FetcherMock = createFetcher({id: 'new', name: 'App'});

    const {result} = renderHook(() => useCreateApplication(), {wrapper: createWrapper({fetcher})});

    await act(async () => {
      await result.current.mutateAsync({name: 'App'});
    });

    expect(result.current.data).toEqual({id: 'new', name: 'App'});
    expect(fetcher.mock.calls[0][1]).toMatchObject({body: '{"name":"App"}', method: 'POST'});
  });
});
