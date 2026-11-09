// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import {OrganizationUnitSwitchErrorCodes} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import BackendClient from '../BackendClient';
import BackendHttpClient from '../BackendHttpClient';
import FetchHttpClient from '../FetchHttpClient';
import ThunderIDBrowserClient from '../ThunderIDBrowserClient';
import SPAUtils from '../utils/SPAUtils';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status});

// In backend mode `baseUrl` is the backend, and the API is reached through its proxy, which the
// backend maps to the API from its own configuration.
const BFF = 'https://app.example.com';

const CONFIG = {
  baseUrl: BFF,
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
    vi.restoreAllMocks();
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

    await expect(client.httpRequest({url: '/users'})).rejects.toBeDefined();

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(await client.isSignedIn()).toBe(false);
  });

  it('refuses to hand out the ID token or exchange tokens', async () => {
    await expect(client.getIdToken()).rejects.toMatchObject({code: 'SPA-AUTH_CLIENT-BACKEND-NS01'});
    await expect(client.exchangeToken({id: 'x'} as any)).rejects.toMatchObject({code: 'SPA-AUTH_CLIENT-BACKEND-NS01'});
  });

  it('sends httpRequest through the proxy', async () => {
    fetchMock.mockResolvedValue(json(200, {users: []}));

    const response = await client.httpRequest({method: 'GET', url: '/users'});

    expect(response?.data).toEqual({users: []});
    expect(fetchMock.mock.calls[0][0]).toBe(`${BFF}/api/auth/proxy/users`);
  });

  it('gets the access token from the backend and stores it like a client credentials token', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 300, token_type: 'Bearer'}));

    expect(await client.getAccessToken()).toBe('t1');
    expect(await client.getAccessToken()).toBe('t1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BFF}/api/auth/token`);
  });

  it('requests a new access token when the stored one is about to expire', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, {access_token: 't1', expires_in: 10}))
      .mockResolvedValueOnce(json(200, {access_token: 't2', expires_in: 300}));

    expect(await client.getAccessToken()).toBe('t1');
    expect(await client.getAccessToken()).toBe('t2');
  });

  it('reads the granted permissions from the session, without the access token', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {...SIGNED_IN, scope: 'openid system:user  system:group:view'}));
    const scoped = new ThunderIDBrowserClient<any>(8);
    await scoped.initialize(CONFIG);

    expect(await scoped.getGrantedPermissions()).toEqual(['openid', 'system:user', 'system:group:view']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BFF}/api/auth/session`);
    FetchHttpClient.destroyInstance(8);
  });

  it('builds /users/me on the proxy, resolved against baseUrl, without a second prefix', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {id: 'u1', username: 'ada'}));

    await client.getUserProfile();

    expect(fetchMock.mock.calls[0][0]).toBe(`${BFF}/api/auth/proxy/users/me`);
  });

  it('does not run OIDC discovery against the backend', async () => {
    fetchMock.mockResolvedValueOnce(json(200, SIGNED_IN));
    const fresh = new ThunderIDBrowserClient<any>(9);
    await fresh.initialize(CONFIG);
    await fresh.isSignedIn();

    expect(fetchMock.mock.calls.map((call: unknown[]) => String(call[0]))).toEqual([`${BFF}/api/auth/session`]);
    FetchHttpClient.destroyInstance(9);
  });

  it('grants nothing when the session has no scope, without asking for the access token', async () => {
    expect(await client.getGrantedPermissions()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
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
    await expect(client.httpRequest({url: '/users'})).rejects.toBeDefined();
    await vi.waitFor(async () => expect(await client.getAccessToken()).toBe('t2'));
  });

  it('reports request errors to the error hook', async () => {
    fetchMock.mockResolvedValue(json(500, {error: 'boom'}));
    const onError = vi.fn();
    await client.on('http-request-error', onError);

    await expect(client.httpRequest({url: '/users'})).rejects.toBeDefined();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('switches the organization unit through the backend without leaving the page', async () => {
    const onSignIn = vi.fn();
    await client.on('sign-in', onSignIn);
    const href: string = window.location.href;
    fetchMock
      .mockResolvedValueOnce(new Response(null, {status: 204}))
      .mockResolvedValueOnce(json(200, {isSignedIn: true, user: {name: 'Ada', ouId: 'ou-2', sub: 'u1'}}));

    expect(await client.switchOrganizationUnit('ou-2')).toEqual({name: 'Ada', ouId: 'ou-2', sub: 'u1'});

    expect(fetchMock.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      `${BFF}/api/auth/switch?ouId=ou-2`,
      `${BFF}/api/auth/session`,
    ]);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(window.location.href).toBe(href);
    expect((await client.getCurrentOrganizationUnit())?.id).toBe('ou-2');
    expect(onSignIn).toHaveBeenCalledWith({name: 'Ada', ouId: 'ou-2', sub: 'u1'});
  });

  it("fails the switch with the backend's error and keeps the session", async () => {
    fetchMock.mockResolvedValueOnce(json(400, {error: 'unauthorized_client'}));

    const signInUrl = vi.spyOn(BackendClient.prototype, 'getSignInUrl');

    await expect(client.switchOrganizationUnit('ou-2')).rejects.toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.UnauthorizedClient,
    });
    expect(await client.getUser()).toEqual({name: 'Ada', sub: 'u1'});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signInUrl).not.toHaveBeenCalled();
  });

  it('signs in at the backend for the unit when the switch needs the user', async () => {
    vi.spyOn(SPAUtils, 'waitTillPageRedirect').mockResolvedValue();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const signInUrl = vi.spyOn(BackendClient.prototype, 'getSignInUrl');
    fetchMock.mockResolvedValueOnce(json(400, {error: 'interaction_required'}));

    expect(await client.switchOrganizationUnit('ou-2')).toBeUndefined();

    expect(signInUrl).toHaveBeenCalledTimes(1);
    expect(signInUrl.mock.results[0].value).toBe(
      `${BFF}/api/auth/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}&ouId=ou-2`,
    );
  });

  it('fails with interaction_required instead of signing in when redirect is off', async () => {
    const signInUrl = vi.spyOn(BackendClient.prototype, 'getSignInUrl');
    fetchMock.mockResolvedValueOnce(json(400, {error: 'interaction_required'}));

    await expect(client.switchOrganizationUnit('ou-2', {redirect: false})).rejects.toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.InteractionRequired,
    });
    expect(signInUrl).not.toHaveBeenCalled();
    expect(await client.getUser()).toEqual({name: 'Ada', sub: 'u1'});
  });

  it('signs out through the backend and navigates to the end-session URL', async () => {
    fetchMock.mockResolvedValue(json(200, {redirectUrl: 'https://auth.example.com/oauth2/logout?client_id=my-app'}));
    const afterSignOut = vi.fn();

    void client.signOut(undefined, afterSignOut);
    await vi.waitFor(() => expect(afterSignOut).toHaveBeenCalled());

    expect(afterSignOut).toHaveBeenCalledWith('https://auth.example.com/oauth2/logout?client_id=my-app');
    expect(fetchMock.mock.calls[0][0]).toBe(`${BFF}/api/auth/signout`);
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
