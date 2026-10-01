// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import FetchHttpClient from '../../FetchHttpClient';
import createHttpClientFetcher from '../createHttpClientFetcher';

const mockRequest = vi.fn();
let getInstanceSpy: ReturnType<typeof vi.spyOn>;

describe('createHttpClientFetcher', () => {
  beforeEach(() => {
    getInstanceSpy = vi
      .spyOn(FetchHttpClient, 'getInstance')
      .mockReturnValue({request: mockRequest} as unknown as FetchHttpClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('resolves an ok Response on a successful request', async () => {
    mockRequest.mockResolvedValueOnce({data: {ok: true}, status: 200, statusText: 'OK'});

    const response = await createHttpClientFetcher()('https://localhost:8090/x', {method: 'POST'});

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ok: true});
  });

  it('reconstructs a non-ok Response from a rejected request that carries a real HTTP response', async () => {
    // FetchHttpClient throws on a non-2xx response rather than resolving it; this must convert
    // that back into a resolved, non-ok Response so the caller sees the real status and body
    // instead of treating it as a network failure.
    mockRequest.mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), {
        response: {data: {code: 'USR-1017'}, status: 400, statusText: 'Bad Request'},
      }),
    );

    const response = await createHttpClientFetcher()('https://localhost:8090/x', {method: 'POST'});

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({code: 'USR-1017'});
  });

  it('rethrows a genuine network error with no attached response', async () => {
    mockRequest.mockRejectedValueOnce(Object.assign(new Error('Failed to fetch'), {code: 'NETWORK_ERROR'}));

    await expect(createHttpClientFetcher()('https://localhost:8090/x', {method: 'POST'})).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('uses the FetchHttpClient instance for the given instanceId', async () => {
    mockRequest.mockResolvedValueOnce({data: undefined, status: 204, statusText: 'No Content'});

    await createHttpClientFetcher(3)('https://localhost:8090/x', {method: 'POST'});

    expect(getInstanceSpy).toHaveBeenCalledWith(3);
  });

  it('forwards the caller-supplied AbortSignal so cancellation reaches the underlying request', async () => {
    mockRequest.mockResolvedValueOnce({data: {ok: true}, status: 200, statusText: 'OK'});
    const controller = new AbortController();

    await createHttpClientFetcher()('https://localhost:8090/x', {method: 'POST', signal: controller.signal});

    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({signal: controller.signal}));
  });

  it('does not attach a signal when the caller did not supply one', async () => {
    mockRequest.mockResolvedValueOnce({data: {ok: true}, status: 200, statusText: 'OK'});

    await createHttpClientFetcher()('https://localhost:8090/x', {method: 'POST'});

    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({signal: undefined}));
  });
});
