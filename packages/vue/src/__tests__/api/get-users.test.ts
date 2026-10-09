// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import getUsers from '../../api/getUsers';

// The httpClient adapter is covered in @thunderid/browser's createHttpClientFetcher tests.
// This file covers the wrapper: plumbing that adapter into the core getUsers as the default fetcher.
const mockFetcher = vi.fn();

vi.mock('@thunderid/browser', async () => {
  const actual = await vi.importActual<typeof import('@thunderid/browser')>('@thunderid/browser');
  return {
    ...actual,
    createHttpClientFetcher: () => mockFetcher,
  };
});

describe('getUsers (vue)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves one page of the user directory using the default fetcher', async () => {
    mockFetcher.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({count: 2, links: [], startIndex: 0, totalResults: 2, users: [{id: 'u1'}, {id: 'u2'}]}),
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(''),
    } as unknown as Response);

    const page = await getUsers({baseUrl: 'https://localhost:8090', limit: 30, offset: 0});

    expect(page.users).toHaveLength(2);
    expect(page.totalResults).toBe(2);
    expect(mockFetcher).toHaveBeenCalledWith(
      expect.stringContaining('/users'),
      expect.objectContaining({method: 'GET'}),
    );
  });

  it('surfaces the real status code when the request is rejected', async () => {
    mockFetcher.mockResolvedValueOnce({
      json: () => Promise.resolve({code: 'USR-1017', message: 'Forbidden'}),
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(JSON.stringify({code: 'USR-1017', message: 'Forbidden'})),
    } as unknown as Response);

    await expect(getUsers({baseUrl: 'https://localhost:8090', limit: 30, offset: 0})).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('still throws a network error when the request never reaches the server', async () => {
    mockFetcher.mockRejectedValueOnce(Object.assign(new Error('Failed to fetch'), {code: 'NETWORK_ERROR'}));

    await expect(getUsers({baseUrl: 'https://localhost:8090', limit: 30, offset: 0})).rejects.toThrow();
  });

  it('uses a caller-supplied fetcher instead of the default when provided', async () => {
    const customFetcher = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({count: 0, links: [], startIndex: 0, totalResults: 0, users: []}),
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(''),
    } as unknown as Response);

    await getUsers({baseUrl: 'https://localhost:8090', fetcher: customFetcher, limit: 30, offset: 0});

    expect(customFetcher).toHaveBeenCalled();
    expect(mockFetcher).not.toHaveBeenCalled();
  });
});
