// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi} from 'vitest';
import {HttpClient, HttpRequestOutcome} from '../HttpClient';
import {HttpError, HttpRequestConfig, HttpResponse} from '../models/http';

class StubHttpClient extends HttpClient {
  constructor(private readonly reply: (config: HttpRequestConfig) => Promise<HttpResponse>) {
    super(false);
  }

  protected transport<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.reply(config) as Promise<HttpResponse<T>>;
  }
}

describe('HttpClient request observer', () => {
  it('sees every request and how it ended, even with the handlers off', async () => {
    const seen: [string | undefined, HttpRequestOutcome][] = [];
    const client: StubHttpClient = new StubHttpClient((config: HttpRequestConfig) =>
      config.url === '/fail'
        ? Promise.reject(Object.assign(new Error('Conflict'), {response: {data: {code: 'APP-1'}, status: 409}}))
        : Promise.resolve({config, data: {}, headers: {}, status: 201, statusText: 'Created'}),
    );
    client.setHttpRequestObserver((config: HttpRequestConfig, outcome: HttpRequestOutcome) =>
      seen.push([config.url, outcome]),
    );

    await client.request({method: 'POST', url: '/ok'});
    await expect(client.request({method: 'POST', url: '/fail'})).rejects.toThrow('Conflict');

    expect(seen[0]).toEqual(['/ok', {headers: {}, ok: true, status: 201}]);
    expect(seen[1][0]).toBe('/fail');
    expect(seen[1][1].ok).toBe(false);
    expect((seen[1][1] as {error: HttpError}).error.response?.status).toBe(409);
  });

  it('does not show a request that opts out, on success or on failure', async () => {
    const seen: (string | undefined)[] = [];
    const client: StubHttpClient = new StubHttpClient((config: HttpRequestConfig) =>
      config.url === '/flow/fail'
        ? Promise.reject(Object.assign(new Error('Bad'), {response: {data: {}, status: 400}}))
        : Promise.resolve({config, data: {}, headers: {}, status: 200, statusText: 'OK'}),
    );
    client.setHttpRequestObserver((config: HttpRequestConfig) => seen.push(config.url));

    await client.request({method: 'POST', observe: false, url: '/flow/execute'});
    await expect(client.request({method: 'POST', observe: false, url: '/flow/fail'})).rejects.toThrow('Bad');
    await client.request({method: 'POST', url: '/groups'});

    expect(seen).toEqual(['/groups']);
  });

  it('keeps the request working when the observer throws, and stops when it is removed', async () => {
    const observer = vi.fn(() => {
      throw new Error('observer failed');
    });
    const client: StubHttpClient = new StubHttpClient((config: HttpRequestConfig) =>
      Promise.resolve({config, data: 'x', headers: {}, status: 200, statusText: 'OK'}),
    );
    client.setHttpRequestObserver(observer);
    await expect(client.request({url: '/a'})).resolves.toMatchObject({data: 'x'});
    client.setHttpRequestObserver(undefined);
    await client.request({url: '/b'});
    expect(observer).toHaveBeenCalledTimes(1);
  });
  it('gives the observer a copy of the headers, and still runs the error callbacks when a success callback throws', async () => {
    const client: StubHttpClient = new StubHttpClient((config: HttpRequestConfig) =>
      Promise.resolve({config, data: {}, headers: {'x-a': '1'}, status: 200, statusText: 'OK'}),
    );
    client.enableHandler();
    client.setHttpRequestObserver((_config: HttpRequestConfig, outcome: HttpRequestOutcome) => {
      if (outcome.ok && outcome.headers) {
        delete outcome.headers['x-a'];
      }
    });
    const response: HttpResponse = await client.request({url: '/a'});
    expect(response.headers).toEqual({'x-a': '1'});

    const outcomes: boolean[] = [];
    const onError = vi.fn();
    client.setHttpRequestObserver((_config: HttpRequestConfig, outcome: HttpRequestOutcome) =>
      outcomes.push(outcome.ok),
    );
    client.setHttpRequestSuccessCallback(() => {
      throw new Error('callback failed');
    });
    client.setHttpRequestErrorCallback(onError);
    await expect(client.request({url: '/b'})).rejects.toThrow('callback failed');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([true]);
  });
});
