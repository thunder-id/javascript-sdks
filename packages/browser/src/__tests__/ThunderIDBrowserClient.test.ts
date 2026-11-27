// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import Hooks from '../constants/Hooks';
import FetchHttpClient from '../FetchHttpClient';
import {BrowserAuthConfig} from '../models/BrowserConfig';
import ThunderIDBrowserClient from '../ThunderIDBrowserClient';

const BASE_URL = 'https://localhost:8090';

// Typed against the default generic: `storage` takes a storage name, and the browser-specific keys are accepted.
const config: BrowserAuthConfig = {
  allowedExternalUrls: [BASE_URL],
  baseUrl: BASE_URL,
  clientId: 'client-id',
  storage: 'browserMemory',
};

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    headers: new Headers({'content-type': 'application/json'}),
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Bad Request',
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

describe('ThunderIDBrowserClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    FetchHttpClient.destroyInstance();
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ok: true}));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('accepts the documented config without an explicit generic', async () => {
    const client = new ThunderIDBrowserClient();

    await expect(client.initialize(config)).resolves.toBe(true);
  });

  it('refuses embedded mode without a client ID, and later calls fail instead of waiting', async () => {
    const client = new ThunderIDBrowserClient();

    await expect(
      client.initialize({
        ...config,
        applicationId: 'app-1',
        clientId: undefined,
        mode: 'embedded',
      } as BrowserAuthConfig),
    ).rejects.toMatchObject({code: 'JS-AUTH_CORE-INIT-IV01'});
    expect(await client.isInitialized()).toBe(false);
    await expect(client.getUser()).rejects.toMatchObject({code: 'SPA-AUTH_CLIENT-VM-NF01'});
  });

  it('ends the wait of a call made while an initialization that fails is running', async () => {
    const client = new ThunderIDBrowserClient();
    const init: Promise<boolean> = client.initialize({
      ...config,
      applicationId: 'app-1',
      clientId: undefined,
      mode: 'embedded',
    } as BrowserAuthConfig);
    const waiting: Promise<boolean> = client.isInitialized();

    await expect(init).rejects.toMatchObject({code: 'JS-AUTH_CORE-INIT-IV01'});
    await expect(waiting).resolves.toBe(false);
  });

  describe('on()', () => {
    it('fires http-request-start and http-request-success hooks registered before initialize()', async () => {
      const client = new ThunderIDBrowserClient();
      const onStart = vi.fn();
      const onSuccess = vi.fn();

      await client.on(Hooks.HttpRequestStart, onStart);
      await client.on(Hooks.HttpRequestSuccess, onSuccess);
      await client.initialize(config);

      await client.httpRequest({attachToken: false, method: 'GET', url: `${BASE_URL}/resource`});

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart).toHaveBeenCalledWith(expect.objectContaining({url: `${BASE_URL}/resource`}));
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({status: 200}));
    });

    it('fires http-request-finish once when a request succeeds', async () => {
      const client = new ThunderIDBrowserClient();
      const onFinish = vi.fn();

      await client.initialize(config);
      await client.on(Hooks.HttpRequestFinish, onFinish);

      await client.httpRequest({attachToken: false, method: 'GET', url: `${BASE_URL}/resource`});

      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('fires http-request-finish once when a request fails', async () => {
      const client = new ThunderIDBrowserClient();
      const onError = vi.fn();
      const onFinish = vi.fn();

      fetchMock.mockResolvedValue(jsonResponse({error: 'bad'}, 400));
      await client.initialize(config);
      await client.on(Hooks.HttpRequestError, onError);
      await client.on(Hooks.HttpRequestFinish, onFinish);

      await expect(
        client.httpRequest({attachToken: false, method: 'GET', url: `${BASE_URL}/resource`}),
      ).rejects.toBeDefined();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('fires http-request-finish once when a batch of requests succeeds', async () => {
      const client = new ThunderIDBrowserClient();
      const onFinish = vi.fn();

      await client.initialize(config);
      await client.on(Hooks.HttpRequestFinish, onFinish);

      await client.httpRequestAll([
        {attachToken: false, method: 'GET', url: `${BASE_URL}/a`},
        {attachToken: false, method: 'GET', url: `${BASE_URL}/b`},
      ]);

      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('calls every callback subscribed to a hook', async () => {
      const client = new ThunderIDBrowserClient();
      const first = vi.fn();
      const second = vi.fn();

      await client.on(Hooks.Initialize, first);
      await client.on(Hooks.Initialize, second);
      await client.initialize(config);

      expect(first).toHaveBeenCalledWith(true);
      expect(second).toHaveBeenCalledWith(true);
    });

    it('calls a callback subscribed twice to the same hook only once', async () => {
      const client = new ThunderIDBrowserClient();
      const callback = vi.fn();

      await client.on(Hooks.Initialize, callback);
      await client.on(Hooks.Initialize, callback);
      await client.initialize(config);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserProfile()', () => {
    it('fetches the profile from /users/me through the client HTTP client', async () => {
      const client = new ThunderIDBrowserClient();

      await client.initialize(config);
      vi.spyOn(client, 'isSignedIn').mockResolvedValue(true);
      fetchMock.mockResolvedValue(jsonResponse({attributes: {email: 'alex@example.com'}, id: 'user-1'}));

      const profile = await client.getUserProfile();

      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/users/me`, expect.objectContaining({method: 'GET'}));
      expect(profile.profile).toMatchObject({email: 'alex@example.com', id: 'user-1'});
      expect(profile.flattenedProfile).toMatchObject({email: 'alex@example.com', id: 'user-1'});
    });

    it('uses endpoints.usersMe when configured', async () => {
      const client = new ThunderIDBrowserClient();

      await client.initialize({...config, endpoints: {usersMe: `${BASE_URL}/custom/me`}});
      vi.spyOn(client, 'isSignedIn').mockResolvedValue(true);
      fetchMock.mockResolvedValue(jsonResponse({id: 'user-1'}));

      await client.getUserProfile();

      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/custom/me`, expect.anything());
    });

    it('rejects when the user is not signed in', async () => {
      const client = new ThunderIDBrowserClient();

      await client.initialize(config);

      await expect(client.getUserProfile()).rejects.toMatchObject({code: 'SPA-AUTH_CLIENT-VM-IV02'});
    });
  });
});
