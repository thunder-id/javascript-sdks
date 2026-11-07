// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {HttpClient, HttpError, HttpRequestConfig, User} from '@thunderid/javascript';
import {afterEach, describe, expect, it, vi} from 'vitest';
import AuthenticationHelper from '../AuthenticationHelper';

const createHelper = (): AuthenticationHelper<unknown> =>
  new AuthenticationHelper<unknown>({} as never, {} as never, 0, {
    exchangeToken: vi.fn(),
    getAccessToken: vi.fn(),
    getCrypto: vi.fn(),
    getDecodedIdToken: vi.fn(),
    getIDPAccessToken: vi.fn(),
    getIdToken: vi.fn(),
    getOpenIDProviderEndpoints: vi.fn(),
    getUser: vi.fn(),
    isSignedIn: vi.fn(),
    refreshAccessToken: vi.fn(),
    setPKCECode: vi.fn(),
  });

const networkError = (): HttpError => Object.assign(new Error('Failed to fetch'), {code: 'NETWORK_ERROR'});

const abortError = (): HttpError =>
  Object.assign(new Error('The operation was aborted.'), {code: 'ABORT_ERROR', name: 'AbortError'});

const unauthorizedError = (): HttpError =>
  Object.assign(new Error('Unauthorized'), {response: {status: 401, statusText: 'Unauthorized'}});

const send = (helper: AuthenticationHelper<unknown>, request: HttpClient['request'], config: HttpRequestConfig) =>
  helper.httpRequest({request} as unknown as HttpClient, config);

describe('AuthenticationHelper httpRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not refresh or resend a POST that failed without a response', async () => {
    const helper = createHelper();
    const refresh = vi.spyOn(helper, 'refreshAccessToken').mockResolvedValue({} as User);
    const error = networkError();
    const request = vi.fn().mockRejectedValue(error);

    await expect(send(helper, request, {method: 'POST', url: 'https://api.example/groups'})).rejects.toBe(error);

    expect(request).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes the token and resends a POST that got a 401', async () => {
    const helper = createHelper();
    const refresh = vi.spyOn(helper, 'refreshAccessToken').mockResolvedValue({} as User);
    const response = {data: {id: 'group-1'}, status: 201};
    const request = vi.fn().mockRejectedValueOnce(unauthorizedError()).mockResolvedValueOnce(response);

    await expect(send(helper, request, {method: 'POST', url: 'https://api.example/groups'})).resolves.toBe(response);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('refreshes the token and resends a GET that failed without a response', async () => {
    const helper = createHelper();
    const refresh = vi.spyOn(helper, 'refreshAccessToken').mockResolvedValue({} as User);
    const response = {data: [], status: 200};
    const request = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValueOnce(response);

    await expect(send(helper, request, {method: 'GET', url: 'https://api.example/groups'})).resolves.toBe(response);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['the fetch client', abortError],
    [
      'a custom transport',
      (): HttpError => new DOMException('The operation was aborted.', 'AbortError') as unknown as HttpError,
    ],
  ])('does not refresh or resend a request the caller aborted, as %s reports it', async (_, createError) => {
    const helper = createHelper();
    const refresh = vi.spyOn(helper, 'refreshAccessToken').mockResolvedValue({} as User);
    const error = createError();
    const request = vi.fn().mockRejectedValue(error);

    await expect(send(helper, request, {method: 'GET', url: 'https://api.example/groups'})).rejects.toBe(error);

    expect(request).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
