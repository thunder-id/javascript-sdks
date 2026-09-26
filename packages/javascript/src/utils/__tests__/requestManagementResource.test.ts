// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, it, expect, vi, type Mock} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import {ApiFetcher} from '../../models/api';
import requestManagementResource, {ManagementResourceRequest} from '../requestManagementResource';

type FetcherMock = Mock<ApiFetcher>;

const okResponse = (body: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(body),
    ok: true,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

const errorResponse = (status: number, statusText: string): Response =>
  ({
    json: () => Promise.resolve({}),
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve('{"code":"X","message":"failed"}'),
  }) as Response;

const createFetcher = (response: Response): FetcherMock => vi.fn<ApiFetcher>().mockResolvedValue(response);

const request: ManagementResourceRequest = {
  collection: 'applications',
  failureMessage: 'Failed',
  method: 'GET',
  operation: 'op',
};

describe('requestManagementResource', () => {
  it('derives the collection URL from baseUrl and appends defined query params', async () => {
    const fetcher: FetcherMock = createFetcher(okResponse({ok: 1}));

    const result: unknown = await requestManagementResource(
      {baseUrl: 'https://localhost:8090', fetcher},
      {...request, query: {include: 'display', limit: 10, offset: undefined}},
    );

    expect(result).toEqual({ok: 1});
    expect(fetcher).toHaveBeenCalledWith('https://localhost:8090/applications?include=display&limit=10', {
      headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
      method: 'GET',
    });
  });

  it('prefers an explicit collection url over baseUrl and addresses a single resource by id', async () => {
    const fetcher: FetcherMock = createFetcher(okResponse({}));

    await requestManagementResource(
      {baseUrl: 'https://idp.example.com', fetcher, url: 'https://rs.example.com/applications/'},
      {...request, id: 'a b'},
    );

    expect(fetcher.mock.calls[0][0]).toBe('https://rs.example.com/applications/a%20b');
  });

  it('serializes the body as JSON and merges caller headers', async () => {
    const fetcher: FetcherMock = createFetcher(okResponse({id: '1'}));

    await requestManagementResource(
      {baseUrl: 'https://localhost:8090', fetcher, headers: {'X-Trace': 't'}},
      {...request, body: {name: 'App'}, method: 'POST'},
    );

    expect(fetcher.mock.calls[0][1]).toEqual({
      body: '{"name":"App"}',
      headers: {Accept: 'application/json', 'Content-Type': 'application/json', 'X-Trace': 't'},
      method: 'POST',
    });
  });

  it('returns undefined for a delete without parsing the body', async () => {
    const response: Response = okResponse(undefined, 204);
    const json: Mock = vi.fn();
    const fetcher: FetcherMock = createFetcher({...response, json} as Response);

    const result: unknown = await requestManagementResource(
      {baseUrl: 'https://localhost:8090', fetcher},
      {...request, id: '1', method: 'DELETE'},
    );

    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('uses the global fetch when no fetcher is given', async () => {
    const mockFetch: FetcherMock = createFetcher(okResponse([]));
    global.fetch = mockFetch as typeof fetch;

    await requestManagementResource({baseUrl: 'https://localhost:8090'}, request);

    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('rejects an invalid URL before any network call', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>();

    await expect(requestManagementResource({baseUrl: 'not a url', fetcher}, request)).rejects.toMatchObject({
      code: 'op-ValidationError-001',
      statusCode: 400,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects an empty identifier before any network call', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>();

    await expect(
      requestManagementResource({baseUrl: 'https://localhost:8090', fetcher}, {...request, id: '  '}),
    ).rejects.toMatchObject({code: 'op-ValidationError-002'});
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'Forbidden', 'op-ForbiddenError-001'],
    [404, 'Not Found', 'op-NotFoundError-001'],
    [500, 'Internal Server Error', 'op-ResponseError-001'],
  ])('maps HTTP %i to a distinct error code', async (status: number, statusText: string, code: string) => {
    const fetcher: FetcherMock = createFetcher(errorResponse(status, statusText));

    const error: unknown = await requestManagementResource({baseUrl: 'https://localhost:8090', fetcher}, request).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ThunderIDAPIError);
    expect(error).toMatchObject({code, statusCode: status, statusText});
  });

  it('wraps a transport failure as a network error', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockRejectedValue(new Error('offline'));

    await expect(
      requestManagementResource({baseUrl: 'https://localhost:8090', fetcher}, request),
    ).rejects.toMatchObject({code: 'op-NetworkError-001', statusCode: 0});
  });
});
