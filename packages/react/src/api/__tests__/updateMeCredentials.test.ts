// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import updateMeCredentials from '../updateMeCredentials';

const mockRequest = vi.fn();

vi.mock('@thunderid/browser', async () => {
  const actual = await vi.importActual<typeof import('@thunderid/browser')>('@thunderid/browser');
  return {
    ...actual,
    FetchHttpClient: {getInstance: () => ({request: mockRequest})},
  };
});

describe('updateMeCredentials (react)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces the real status code when the current password is rejected', async () => {
    // httpClient.request throws (rather than resolving) on a non-2xx response, carrying the
    // response on the error. The default fetcher must convert that back into a resolved,
    // non-ok Response so the caller sees the real 403, not a generic network error.
    mockRequest.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), {
        response: {
          data: {code: 'USR-1029', message: {defaultValue: 'Invalid current password'}},
          status: 403,
          statusText: 'Forbidden',
        },
      }),
    );

    await expect(
      updateMeCredentials({
        currentPassword: 'wrong',
        payload: {password: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).rejects.toMatchObject({statusCode: 403});
  });

  it('still throws a network error when the request never reaches the server', async () => {
    mockRequest.mockRejectedValueOnce(Object.assign(new Error('Failed to fetch'), {code: 'NETWORK_ERROR'}));

    await expect(
      updateMeCredentials({
        payload: {password: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).rejects.toMatchObject({code: 'updateMeCredentials-NetworkError-001'});
  });

  it('resolves on a successful update', async () => {
    mockRequest.mockResolvedValueOnce({data: undefined, status: 204, statusText: 'No Content'});

    await expect(
      updateMeCredentials({
        currentPassword: '0ldP@ssword!',
        payload: {password: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).resolves.toBeUndefined();
  });
});
