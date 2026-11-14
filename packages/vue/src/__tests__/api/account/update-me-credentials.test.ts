// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import updateMeCredentials from '../../../api/account/updateMeCredentials';

// The httpClient-to-Response adapter itself (status-code recovery, network-error passthrough)
// now lives in @thunderid/browser's createHttpClientFetcher and is covered there directly
// (packages/browser/src/utils/__tests__/createHttpClientFetcher.test.ts). This file exercises
// this wrapper's own job instead: plumbing that adapter through to the core updateMeCredentials
// as the default fetcher, and letting the core function's own error mapping run end to end.
const mockFetcher = vi.fn();

vi.mock('@thunderid/browser', async () => {
  const actual = await vi.importActual<typeof import('@thunderid/browser')>('@thunderid/browser');
  return {
    ...actual,
    createHttpClientFetcher: () => mockFetcher,
  };
});

describe('updateMeCredentials (vue)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces the real status code when the write is rejected', async () => {
    // The core updateMeCredentials reads the error body via `.text()`, not `.json()`.
    mockFetcher.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve(JSON.stringify({code: 'USR-1017', message: {defaultValue: 'Missing credentials'}})),
    } as Response);

    await expect(
      updateMeCredentials({
        payload: {currentValue: '0ldP@ssword!', name: 'password', newValue: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).rejects.toMatchObject({statusCode: 400});
  });

  it('still throws a network error when the request never reaches the server', async () => {
    mockFetcher.mockRejectedValueOnce(Object.assign(new Error('Failed to fetch'), {code: 'NETWORK_ERROR'}));

    await expect(
      updateMeCredentials({
        payload: {currentValue: '0ldP@ssword!', name: 'password', newValue: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).rejects.toMatchObject({code: 'updateMeCredentials-NetworkError-001'});
  });

  it('resolves on a successful update', async () => {
    mockFetcher.mockResolvedValueOnce({
      json: () => Promise.resolve(undefined),
      ok: true,
      status: 204,
      statusText: 'No Content',
    } as Response);

    await expect(
      updateMeCredentials({
        payload: {currentValue: '0ldP@ssword!', name: 'password', newValue: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).resolves.toBeUndefined();
  });
});
