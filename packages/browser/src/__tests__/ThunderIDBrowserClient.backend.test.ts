// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import BackendHttpClient from '../BackendHttpClient';
import FetchHttpClient from '../FetchHttpClient';
import ThunderIDBrowserClient from '../ThunderIDBrowserClient';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status});

const CONFIG = {
  baseUrl: 'https://auth.example.com',
  clientId: 'my-app',
  endpoints: {backend: {bypass: {urls: ['https://dp.example.com']}}},
  storage: 'browserMemory',
};

const SIGNED_IN = {isSignedIn: true, user: {name: 'Ada', sub: 'u1'}};

describe('ThunderIDBrowserClient with sign-in on the backend', () => {
  let fetchMock: Mock;
  let client: ThunderIDBrowserClient<any>;

  beforeEach(async () => {
    // Initialization reads the session, so it gets a signed-in session; each test sets its own
    // responses after that.
    fetchMock = vi.fn().mockResolvedValueOnce(json(200, SIGNED_IN));
    vi.stubGlobal('fetch', fetchMock);
    client = new ThunderIDBrowserClient<any>(7);
    await client.initialize(CONFIG);
    await client.isSignedIn();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    FetchHttpClient.destroyInstance(7);
  });

  it('registers the backend HTTP client for the instance', () => {
    expect(client.isBackendMode()).toBe(true);
    expect(FetchHttpClient.getInstance(7)).toBeInstanceOf(BackendHttpClient);
  });

  it('reads sign-in state and the user from the session read at initialization', async () => {
    expect(client.isLoading()).toBe(false);
    expect(await client.isSignedIn()).toBe(true);
    expect(await client.getUser()).toEqual({name: 'Ada', sub: 'u1'});
    expect(await client.getDecodedIdToken()).toEqual({name: 'Ada', sub: 'u1'});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the session read across a repeated initialization with the same endpoints', async () => {
    await client.initialize(CONFIG);

    expect(await client.isSignedIn()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs the app out when the session ends elsewhere', async () => {
    const onSignOut = vi.fn();
    await client.on('sign-out', onSignOut);
    fetchMock.mockResolvedValueOnce(json(401, {error: 'login_required'}));

    await expect(client.httpRequest({url: 'https://auth.example.com/users'})).rejects.toBeDefined();

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(await client.isSignedIn()).toBe(false);
  });

  it('refuses to hand out the ID token or exchange tokens', async () => {
    await expect(client.getIdToken()).rejects.toMatchObject({code: 'SPA-AUTH_CLIENT-BACKEND-NS01'});
    await expect(client.exchangeToken({id: 'x'} as any)).rejects.toMatchObject({code: 'SPA-AUTH_CLIENT-BACKEND-NS01'});
  });

  it('sends httpRequest through the proxy', async () => {
    fetchMock.mockResolvedValue(json(200, {users: []}));

    const response = await client.httpRequest({method: 'GET', url: 'https://auth.example.com/users'});

    expect(response?.data).toEqual({users: []});
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/proxy/users');
  });

  it('gets the access token from the backend and stores it like a client credentials token', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 300, token_type: 'Bearer'}));

    expect(await client.getAccessToken()).toBe('t1');
    expect(await client.getAccessToken()).toBe('t1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/token');
  });

  it('requests a new access token when the stored one is about to expire', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 10}))
      .mockResolvedValueOnce(json(200, {access_token: 't2', expires_in: 300}));

    expect(await client.getAccessToken()).toBe('t1');
    expect(await client.getAccessToken()).toBe('t2');
  });

  it('shares one token request between concurrent callers', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 300}));

    expect(await Promise.all([client.getAccessToken(), client.getAccessToken()])).toEqual(['t1', 't1']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a bypassed httpRequest straight there with the access token', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 300}))
      .mockResolvedValueOnce(json(200, {orders: []}));

    const response = await client.httpRequest({url: 'https://dp.example.com/orders'});

    expect(response?.data).toEqual({orders: []});
    expect(fetchMock.mock.calls[1][0]).toBe('https://dp.example.com/orders');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer t1');
  });

  it('drops the access token when the session ends elsewhere', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 300}))
      .mockResolvedValueOnce(json(401, {error: 'login_required'}))
      .mockResolvedValueOnce(json(200, {access_token: 't2', expires_in: 300}));

    expect(await client.getAccessToken()).toBe('t1');
    await expect(client.httpRequest({url: 'https://auth.example.com/users'})).rejects.toBeDefined();
    await vi.waitFor(async () => expect(await client.getAccessToken()).toBe('t2'));
  });

  it('reports request errors to the error hook', async () => {
    fetchMock.mockResolvedValue(json(500, {error: 'boom'}));
    const onError = vi.fn();
    await client.on('http-request-error', onError);

    await expect(client.httpRequest({url: 'https://auth.example.com/users'})).rejects.toBeDefined();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('signs out through the backend and navigates to the end-session URL', async () => {
    fetchMock.mockResolvedValue(json(200, {redirectUrl: 'https://auth.example.com/oauth2/logout?client_id=my-app'}));
    const afterSignOut = vi.fn();

    void client.signOut(undefined, afterSignOut);
    await vi.waitFor(() => expect(afterSignOut).toHaveBeenCalled());

    expect(afterSignOut).toHaveBeenCalledWith('https://auth.example.com/oauth2/logout?client_id=my-app');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/signout');
  });
});

describe('ThunderIDBrowserClient loading state with sign-in on the backend', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FetchHttpClient.destroyInstance(8);
  });

  it('reports loading until the first session read settles', async () => {
    let respond: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve: (response: Response) => void) => {
            respond = resolve;
          }),
      ),
    );
    const client = new ThunderIDBrowserClient<any>(8);
    await client.initialize(CONFIG);

    expect(client.isLoading()).toBe(true);

    respond(json(200, {isSignedIn: false}));
    expect(await client.isSignedIn()).toBe(false);
    expect(client.isLoading()).toBe(false);
  });

  it('does not report loading without a backend', async () => {
    const client = new ThunderIDBrowserClient<any>(8);
    await client.initialize({baseUrl: 'https://auth.example.com', clientId: 'my-app', storage: 'browserMemory'});

    expect(client.isLoading()).toBe(false);
  });
});
