// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {ResolvedBackendEndpoints} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import BackendClient, {BACKEND_REQUEST_HEADER} from '../BackendClient';
import BackendHttpClient from '../BackendHttpClient';

const ENDPOINTS: ResolvedBackendEndpoints = {
  apiBaseUrl: 'https://auth.example.com',
  bypass: {attachToken: true, urls: ['https://dp.example.com/api']},
  checkSession: '/api/auth/checksession',
  proxy: '/api/auth/proxy',
  refresh: '/api/auth/refresh',
  session: '/api/auth/session',
  signIn: '/api/auth/signin',
  signOut: '/api/auth/signout',
  token: '/api/auth/token',
};

const noToken = (): Promise<string> => Promise.reject(new Error('no token expected'));

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status});

const empty = (status: number): Response => new Response(null, {status});

describe('BackendClient', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the session with the CSRF header and same-origin credentials, and caches it', async () => {
    fetchMock.mockResolvedValue(json(200, {isSignedIn: true, user: {sub: 'u1'}}));
    const backend = new BackendClient(ENDPOINTS);

    expect(await backend.getSession()).toEqual({isSignedIn: true, user: {sub: 'u1'}});
    await backend.getSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/session');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers[BACKEND_REQUEST_HEADER]).toBe('XMLHttpRequest');
  });

  it('refreshes once when the session has expired', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, {error: 'session_expired'}))
      .mockResolvedValueOnce(empty(204))
      .mockResolvedValueOnce(json(200, {isSignedIn: true}));

    expect((await new BackendClient(ENDPOINTS).getSession()).isSignedIn).toBe(true);
    expect(fetchMock.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      '/api/auth/session',
      '/api/auth/refresh',
      '/api/auth/session',
    ]);
  });

  it('reports signed out when the refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));

    expect(await new BackendClient(ENDPOINTS).getSession()).toEqual({isSignedIn: false});
  });

  it('shares one refresh between concurrent callers', async () => {
    fetchMock.mockResolvedValue(empty(204));
    const backend = new BackendClient(ENDPOINTS);

    expect(await Promise.all([backend.refresh(), backend.refresh()])).toEqual([true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('builds the sign-in URL with the return path', () => {
    expect(new BackendClient(ENDPOINTS).getSignInUrl('/app/users?x=1')).toBe(
      '/api/auth/signin?returnTo=%2Fapp%2Fusers%3Fx%3D1',
    );
  });

  it('signs out and returns the end-session URL', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {redirectUrl: 'https://auth.example.com/oauth2/logout?x'}));
    const backend = new BackendClient(ENDPOINTS);

    expect(await backend.signOut()).toBe('https://auth.example.com/oauth2/logout?x');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect((await backend.getSession()).isSignedIn).toBe(false);
  });

  it('maps API URLs to the proxy and refuses other origins', () => {
    const backend = new BackendClient(ENDPOINTS);

    expect(backend.toProxyUrl('https://auth.example.com/users?limit=5')).toBe('/api/auth/proxy/users?limit=5');
    expect(backend.toProxyUrl('https://auth.example.com')).toBe('/api/auth/proxy/');
    expect(backend.toProxyUrl('/applications')).toBe('/api/auth/proxy/applications');
    expect(backend.toProxyUrl('https://auth.example.com.evil.com/users')).toBeUndefined();
    expect(backend.toProxyUrl('https://other.example.com/users')).toBeUndefined();
    expect(backend.toProxyUrl('//other.example.com/users')).toBeUndefined();
  });
});

describe('BackendHttpClient', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends requests through the proxy without a token', async () => {
    fetchMock.mockResolvedValueOnce(json(201, {id: 'u1'}));
    const client = new BackendHttpClient(new BackendClient(ENDPOINTS), noToken);

    const response = await client.request({
      data: {name: 'a'},
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
      url: 'https://auth.example.com/users',
    });

    expect(response.status).toBe(201);
    expect(response.data).toEqual({id: 'u1'});
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/proxy/users');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers[BACKEND_REQUEST_HEADER]).toBe('XMLHttpRequest');
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).toBe('{"name":"a"}');
  });

  it('refreshes and retries once on 401', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, {error: 'session_expired'}))
      .mockResolvedValueOnce(empty(204))
      .mockResolvedValueOnce(json(200, {ok: true}));
    const client = new BackendHttpClient(new BackendClient(ENDPOINTS), noToken);

    const response = await client.request({url: 'https://auth.example.com/users'});

    expect(response.data).toEqual({ok: true});
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns an API 401 as is, without a refresh', async () => {
    fetchMock.mockResolvedValueOnce(json(401, {code: 'unauthorized'}));
    const client = new BackendHttpClient(new BackendClient(ENDPOINTS), noToken);

    await expect(client.request({url: 'https://auth.example.com/users'})).rejects.toMatchObject({
      response: {status: 401},
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws the 401 when the refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(json(401, {error: 'session_expired'})).mockResolvedValueOnce(json(401, {}));
    const client = new BackendHttpClient(new BackendClient(ENDPOINTS), noToken);

    await expect(client.request({url: 'https://auth.example.com/users'})).rejects.toMatchObject({
      response: {status: 401},
    });
  });

  it('refuses URLs outside the API base', async () => {
    const client = new BackendHttpClient(new BackendClient(ENDPOINTS), noToken);

    await expect(client.request({url: 'https://other.example.com/x'})).rejects.toMatchObject({
      code: 'BACKEND_UNSUPPORTED_URL',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('BackendClient session end', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const signedInClient = async (): Promise<{backend: BackendClient; onSignedOut: Mock}> => {
    fetchMock.mockResolvedValueOnce(json(200, {isSignedIn: true}));
    const backend = new BackendClient(ENDPOINTS);
    const onSignedOut = vi.fn();
    backend.onSignedOut(onSignedOut);
    await backend.getSession();

    return {backend, onSignedOut};
  };

  it('tells the listeners when a check finds the session ended', async () => {
    const {backend, onSignedOut} = await signedInClient();
    fetchMock.mockResolvedValueOnce(json(200, {isSignedIn: false}));

    expect(await backend.checkSession()).toBe(false);

    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/checksession');
    expect(onSignedOut).toHaveBeenCalledTimes(1);
    expect((await backend.getSession()).isSignedIn).toBe(false);
  });

  it('stays quiet while the session is live, and when a check fails', async () => {
    const {backend, onSignedOut} = await signedInClient();
    fetchMock.mockResolvedValueOnce(json(200, {isSignedIn: true})).mockRejectedValueOnce(new Error('offline'));

    expect(await backend.checkSession()).toBe(true);
    expect(await backend.checkSession()).toBe(true);
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it('tells the listeners when the proxy says the session ended', async () => {
    const {backend, onSignedOut} = await signedInClient();
    fetchMock.mockResolvedValueOnce(json(401, {error: 'login_required'}));

    await expect(new BackendHttpClient(backend, noToken).request({url: '/users'})).rejects.toMatchObject({
      response: {status: 401},
    });
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('tells the listeners when a refresh fails', async () => {
    const {backend, onSignedOut} = await signedInClient();
    fetchMock.mockResolvedValueOnce(json(401, {}));

    expect(await backend.refresh()).toBe(false);
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('does not tell the listeners about its own sign-out', async () => {
    const {backend, onSignedOut} = await signedInClient();
    fetchMock.mockResolvedValueOnce(json(200, {redirectUrl: '/bye'}));

    await backend.signOut();

    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it('polls while signed in and checks on focus, at most once per throttle window', async () => {
    const {backend} = await signedInClient();
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(json(200, {isSignedIn: true}));
    const stop = backend.watch(30);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event('focus'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5_000);
    window.dispatchEvent(new Event('focus'));
    expect(fetchMock).toHaveBeenCalledTimes(3);

    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not check before anyone has signed in', async () => {
    vi.useFakeTimers();
    const backend = new BackendClient(ENDPOINTS);
    const stop = backend.watch(30);

    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(fetchMock).not.toHaveBeenCalled();
    stop();
  });
});

describe('BackendClient bypass', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('matches URLs under a bypass URL only', () => {
    const backend = new BackendClient(ENDPOINTS);

    expect(backend.isBypassed('https://dp.example.com/api/orders')).toBe(true);
    expect(backend.isBypassed('https://dp.example.com/api?x=1')).toBe(true);
    expect(backend.isBypassed('https://dp.example.com/apix')).toBe(false);
    expect(backend.isBypassed('https://dp.example.com.evil.com/api')).toBe(false);
    expect(backend.isBypassed('/orders')).toBe(false);
  });

  it('requests the access token with the CSRF header and same-origin credentials', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 300, token_type: 'Bearer'}));

    expect(await new BackendClient(ENDPOINTS).requestAccessToken()).toEqual({
      access_token: 't1',
      expires_in: 300,
      token_type: 'Bearer',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/token');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers[BACKEND_REQUEST_HEADER]).toBe('XMLHttpRequest');
  });

  it('refreshes the session when the token endpoint says it expired', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, {error: 'session_expired'}))
      .mockResolvedValueOnce(empty(204))
      .mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 300}));

    expect((await new BackendClient(ENDPOINTS).requestAccessToken()).access_token).toBe('t1');
    expect(fetchMock.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      '/api/auth/token',
      '/api/auth/refresh',
      '/api/auth/token',
    ]);
  });

  it('fails when the backend will not issue a token', async () => {
    fetchMock.mockResolvedValueOnce(json(403, {error: 'access_denied'}));

    await expect(new BackendClient(ENDPOINTS).requestAccessToken()).rejects.toMatchObject({
      code: 'SPA-BACKEND_CLIENT-RAT-SE01',
    });
  });
});

describe('BackendHttpClient bypass', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a bypassed request with the access token and the cookies', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {orders: []}));
    const client = new BackendHttpClient(new BackendClient(ENDPOINTS), () => Promise.resolve('t1'));

    const response = await client.request({
      headers: {Accept: 'application/json'},
      url: 'https://dp.example.com/api/orders',
    });

    expect(response.data).toEqual({orders: []});
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://dp.example.com/api/orders');
    expect(init.credentials).toBe('include');
    expect(init.headers.Authorization).toBe('Bearer t1');
    expect(init.headers.Accept).toBe('application/json');
    expect(init.headers[BACKEND_REQUEST_HEADER]).toBeUndefined();
  });

  it('asks for a new token and retries once when the API rejects the token', async () => {
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(200, {ok: true}));
    const getAccessToken = vi.fn((renew: boolean) => Promise.resolve(renew ? 't2' : 't1'));
    const client = new BackendHttpClient(new BackendClient(ENDPOINTS), getAccessToken);

    expect((await client.request({url: 'https://dp.example.com/api/a'})).data).toEqual({ok: true});
    expect(getAccessToken.mock.calls).toEqual([[false], [true]]);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer t2');
  });

  it('sends a bypassed request with only the cookies when attachToken is off', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {ok: true}));
    const getAccessToken = vi.fn(() => Promise.resolve('t1'));
    const backend = new BackendClient({...ENDPOINTS, bypass: {...ENDPOINTS.bypass, attachToken: false}});
    const client = new BackendHttpClient(backend, getAccessToken);

    await client.request({url: 'https://dp.example.com/api/a'});

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://dp.example.com/api/a');
    expect(init.credentials).toBe('include');
    expect(init.headers.Authorization).toBeUndefined();
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('returns a second 401 from the API as is', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(401, {})));
    const client = new BackendHttpClient(new BackendClient(ENDPOINTS), () => Promise.resolve('t1'));

    await expect(client.request({url: 'https://dp.example.com/api/a'})).rejects.toMatchObject({
      response: {status: 401},
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
