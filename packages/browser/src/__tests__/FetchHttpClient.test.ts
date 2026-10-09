// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {HttpRequestConfig} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import FetchHttpClient from '../FetchHttpClient';

/** `transport` is protected on purpose; these tests exercise it directly, below the request pipeline. */
const transport = (client: FetchHttpClient, config: HttpRequestConfig): Promise<unknown> =>
  (client as unknown as {transport: (c: HttpRequestConfig) => Promise<unknown>}).transport(config);

describe('FetchHttpClient', () => {
  beforeEach(() => {
    FetchHttpClient.destroyInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('forwards a caller-supplied AbortSignal to the underlying fetch call', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({'content-type': 'application/json'}),
      json: () => Promise.resolve({ok: true}),
      ok: true,
      status: 200,
      statusText: 'OK',
    });
    vi.stubGlobal('fetch', fetchMock);

    const client: FetchHttpClient = FetchHttpClient.getInstance();
    await transport(client, {method: 'GET', signal: controller.signal, url: 'https://localhost:8090/x'});

    expect(fetchMock).toHaveBeenCalledWith(
      'https://localhost:8090/x',
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('surfaces an aborted request as a distinguishable AbortError, not a generic NETWORK_ERROR', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.reject(abortError)),
    );

    const client: FetchHttpClient = FetchHttpClient.getInstance();
    controller.abort();

    await expect(
      transport(client, {method: 'GET', signal: controller.signal, url: 'https://localhost:8090/x'}),
    ).rejects.toMatchObject({code: 'ABORT_ERROR', name: 'AbortError'});
  });
});
