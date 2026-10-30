// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import executeEmbeddedSelfServiceFlow from '../../../api/auth/executeEmbeddedSelfServiceFlow';

// The adapter itself lives in @thunderid/browser's createHttpClientFetcher and is covered there. This
// file checks the wrapper's job: the authenticated adapter is the default transport, and the core
// function's own handling of a refusal runs end to end through it.
const mockFetcher = vi.fn();
const mockCreateHttpClientFetcher = vi.fn(() => mockFetcher);

vi.mock('@thunderid/browser', async () => {
  const actual = await vi.importActual<typeof import('@thunderid/browser')>('@thunderid/browser');
  return {
    ...actual,
    createHttpClientFetcher: (instanceId: number) => mockCreateHttpClientFetcher(instanceId),
  };
});

const start = {
  flowType: 'SELF_SERVICE',
  handle: 'default-self-attribute-verification-flow',
  inputs: {attribute: 'email'},
};

describe('executeEmbeddedSelfServiceFlow (vue)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends the step through the instance's authenticated transport, with no user or application ID", async () => {
    mockFetcher.mockResolvedValueOnce({
      json: () => Promise.resolve({executionId: 'exec-1', flowStatus: 'INCOMPLETE'}),
      ok: true,
      status: 200,
    } as Response);

    const step = await executeEmbeddedSelfServiceFlow({
      instanceId: 2,
      payload: start as never,
      url: 'https://localhost:8090/flow/execute',
    });

    expect(step).toEqual({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
    expect(mockCreateHttpClientFetcher).toHaveBeenCalledWith(2);
    const [url, init] = mockFetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://localhost:8090/flow/execute');
    expect(JSON.parse(init.body as string)).toEqual({...start, verbose: true});
  });

  it('reports a 4xx as a refusal with its status', async () => {
    mockFetcher.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve('{"code":"FES-1017"}'),
    } as Response);

    const failure: unknown = await executeEmbeddedSelfServiceFlow({
      payload: start as never,
      url: 'https://localhost:8090/flow/execute',
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ThunderIDAPIError);
    expect((failure as ThunderIDAPIError).statusCode).toBe(403);
  });

  it('prefers a fetcher the caller supplies', async () => {
    const fetcher = vi.fn().mockResolvedValue({json: () => Promise.resolve({}), ok: true, status: 200} as Response);

    await executeEmbeddedSelfServiceFlow({
      fetcher,
      payload: start as never,
      url: 'https://localhost:8090/flow/execute',
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mockCreateHttpClientFetcher).not.toHaveBeenCalled();
  });
});
