// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import handleBffRequest, {getRequestOrigins, toSafeReturnTo} from '../handleBffRequest';
import {BffAdapter, BffOptions, BffSession} from '../models';

const ORIGIN = 'https://app.example.com';
const API = 'https://api.example.com/v1';

const SESSION: BffSession = {
  accessToken: 'secret-access-token',
  expiresAt: 2_000_000_000,
  idTokenClaims: {
    aud: 'client',
    auth_time: 1,
    email: 'a@example.com',
    iss: 'https://idp',
    nonce: 'n',
    sid: 's',
    sub: 'u',
  },
  scope: 'openid profile',
};

type FakeAdapter = {[K in keyof Required<BffAdapter>]: Mock};

const createAdapter = (session: BffSession | null = SESSION): FakeAdapter => ({
  backchannelLogout: vi.fn().mockResolvedValue(new Response(null, {status: 200})),
  callback: vi.fn().mockResolvedValue(new Response(null, {headers: {location: '/'}, status: 302})),
  getSession: vi.fn().mockResolvedValue(session),
  isSessionLive: vi.fn().mockResolvedValue(Boolean(session)),
  refresh: vi.fn().mockResolvedValue(Boolean(session)),
  signIn: vi.fn().mockResolvedValue(new Response(null, {headers: {location: 'https://idp/authorize'}, status: 302})),
  signOut: vi.fn().mockResolvedValue({redirectUrl: 'https://idp/logout'}),
  switchOrganizationUnit: vi.fn().mockResolvedValue({ok: true}),
});

/** A call as the browser SDK makes it: same origin, with the request header. */
const sdkCall = (path: string, init: RequestInit = {}): Request =>
  new Request(`${ORIGIN}/api/auth${path}`, {
    ...init,
    headers: {'sec-fetch-site': 'same-origin', 'x-requested-with': 'XMLHttpRequest', ...(init.headers ?? {})},
  });

const handle = async (request: Request, adapter: BffAdapter, options: BffOptions = {}): Promise<Response> => {
  const response: Response | undefined = await handleBffRequest(request, adapter, {apiBaseUrl: API, ...options});

  if (!response) {
    throw new Error('Expected a response.');
  }

  return response;
};

describe('handleBffRequest', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', {headers: {'content-type': 'application/json'}}));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves requests outside the prefix to the framework', async () => {
    expect(await handleBffRequest(new Request(`${ORIGIN}/dashboard`), createAdapter())).toBeUndefined();
    expect(await handleBffRequest(new Request(`${ORIGIN}/api/authx`), createAdapter())).toBeUndefined();
  });

  describe('the session endpoints', () => {
    it('reports the user without the protocol claims and without any token', async () => {
      const response: Response = await handle(sdkCall('/session'), createAdapter());
      const text: string = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(JSON.parse(text)).toEqual({
        expiresAt: 2_000_000_000,
        isSignedIn: true,
        scope: 'openid profile',
        user: {auth_time: 1, email: 'a@example.com', sub: 'u'},
      });
      expect(text).not.toContain('secret-access-token');
    });

    it('reports a signed-out session', async () => {
      const response: Response = await handle(sdkCall('/session'), createAdapter(null));

      expect(await response.json()).toEqual({isSignedIn: false});
    });

    it('checks the session without refreshing it', async () => {
      const adapter: FakeAdapter = createAdapter();
      const response: Response = await handle(sdkCall('/checksession'), adapter);

      expect(await response.json()).toEqual({isSignedIn: true});
      expect(adapter.isSessionLive).toHaveBeenCalled();
      expect(adapter.getSession).not.toHaveBeenCalled();
      expect(adapter.refresh).not.toHaveBeenCalled();
    });

    it('answers a refresh with 204, or 401 login_required when the session is over', async () => {
      expect((await handle(sdkCall('/refresh', {method: 'POST'}), createAdapter())).status).toBe(204);

      const over: Response = await handle(sdkCall('/refresh', {method: 'POST'}), createAdapter(null));

      expect(over.status).toBe(401);
      expect(await over.json()).toEqual({error: 'login_required'});
    });

    it('signs out and returns where the browser goes next', async () => {
      const response: Response = await handle(sdkCall('/signout', {method: 'POST'}), createAdapter());

      expect(await response.json()).toEqual({redirectUrl: 'https://idp/logout'});
    });
  });

  describe('sign-in', () => {
    it('starts sign-in without the request header, keeping only a local returnTo', async () => {
      const adapter: FakeAdapter = createAdapter();

      await handle(new Request(`${ORIGIN}/api/auth/signin?returnTo=/orders&ouId=ou-1`), adapter);
      await handle(new Request(`${ORIGIN}/api/auth/signin?returnTo=//evil.example`), adapter);

      expect(adapter.signIn).toHaveBeenNthCalledWith(1, expect.any(Request), {ouId: 'ou-1', returnTo: '/orders'});
      expect(adapter.signIn).toHaveBeenNthCalledWith(2, expect.any(Request), {ouId: undefined, returnTo: '/'});
    });

    it('completes sign-in on the callback without the request header', async () => {
      const adapter: FakeAdapter = createAdapter();

      expect((await handle(new Request(`${ORIGIN}/api/auth/callback?code=c&state=s`), adapter)).status).toBe(302);
      expect(adapter.callback).toHaveBeenCalled();
    });
  });

  describe('the CSRF rules', () => {
    it('refuses a call without the request header', async () => {
      const response: Response = await handle(new Request(`${ORIGIN}/api/auth/session`), createAdapter());

      expect(response.status).toBe(403);
      expect((await response.json()) as {error: string}).toMatchObject({error: 'forbidden'});
    });

    it('refuses a call the browser reports as cross-site or same-site', async () => {
      for (const site of ['cross-site', 'same-site']) {
        const response: Response = await handle(
          sdkCall('/signout', {headers: {'sec-fetch-site': site}, method: 'POST'}),
          createAdapter(),
        );

        expect(response.status).toBe(403);
      }
    });

    it('refuses a state-changing call from an origin that is not allowed', async () => {
      const adapter: FakeAdapter = createAdapter();
      const refused: Response = await handle(
        sdkCall('/signout', {headers: {origin: 'https://evil.example'}, method: 'POST'}),
        adapter,
        {allowedOrigins: [ORIGIN]},
      );
      const accepted: Response = await handle(
        sdkCall('/signout', {headers: {origin: ORIGIN}, method: 'POST'}),
        adapter,
        {allowedOrigins: [ORIGIN]},
      );

      expect(refused.status).toBe(403);
      expect(accepted.status).toBe(200);
      expect(adapter.signOut).toHaveBeenCalledTimes(1);
    });

    it('lets the authorization server post a back-channel logout without the header', async () => {
      const adapter: FakeAdapter = createAdapter();
      const response: Response = await handle(
        new Request(`${ORIGIN}/api/auth/backchannel-logout`, {body: 'logout_token=x', method: 'POST'}),
        adapter,
      );

      expect(response.status).toBe(200);
      expect(adapter.backchannelLogout).toHaveBeenCalled();
    });
  });

  describe('the API proxy', () => {
    it('forwards with the access token and only the allowed headers', async () => {
      const response: Response = await handle(
        sdkCall('/proxy/users/me?attributes=email', {headers: {accept: 'application/json', cookie: 'a=b'}}),
        createAdapter(),
      );
      const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = new Headers(init.headers);

      expect(response.status).toBe(200);
      expect(target).toBe(`${API}/users/me?attributes=email`);
      expect(headers.get('authorization')).toBe('Bearer secret-access-token');
      expect(headers.get('accept')).toBe('application/json');
      expect(headers.get('cookie')).toBeNull();
      expect(headers.get('x-requested-with')).toBeNull();
      expect(init.redirect).toBe('manual');
    });

    it('answers 401 login_required without a session, and passes an API 401 through', async () => {
      const noSession: Response = await handle(sdkCall('/proxy/users/me'), createAdapter(null));

      expect(noSession.status).toBe(401);
      expect(await noSession.json()).toEqual({error: 'login_required'});

      fetchMock.mockResolvedValueOnce(new Response('{"code":"API-401"}', {status: 401}));
      const apiRefusal: Response = await handle(sdkCall('/proxy/users/me'), createAdapter());

      expect(apiRefusal.status).toBe(401);
      expect(await apiRefusal.json()).toEqual({code: 'API-401'});
    });

    it('refuses a path that would leave the API', async () => {
      // An encoded slash is not resolved by the URL parser, so the handler refuses it.
      const encoded: Response = await handle(sdkCall('/proxy/..%2fadmin'), createAdapter());

      expect(encoded.status).toBe(400);
      expect(await encoded.json()).toEqual({error: 'invalid_path'});

      // Dot segments are resolved while the URL is parsed, so the request is no longer under the prefix.
      expect(
        await handleBffRequest(sdkCall('/proxy/%2e%2e/%2e%2e/admin'), createAdapter(), {apiBaseUrl: API}),
      ).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('serves the public sign-in metadata without a session or the request header', async () => {
      const adapter: FakeAdapter = createAdapter(null);
      const response: Response = await handle(new Request(`${ORIGIN}/api/auth/proxy/flow/meta?type=APP`), adapter);
      const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];

      expect(response.status).toBe(200);
      expect(target).toBe(`${API}/flow/meta?type=APP`);
      expect(new Headers(init.headers).get('authorization')).toBeNull();
      expect(adapter.getSession).not.toHaveBeenCalled();
    });

    it('answers 502 when the API cannot be reached', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

      expect((await handle(sdkCall('/proxy/users/me'), createAdapter())).status).toBe(502);
    });
  });

  describe('the token endpoint', () => {
    it('is not served unless turned on', async () => {
      const response: Response = await handle(sdkCall('/token', {method: 'POST'}), createAdapter());

      expect(response.status).toBe(404);
    });

    it('returns the access token without the refresh token when turned on', async () => {
      const response: Response = await handle(sdkCall('/token', {method: 'POST'}), createAdapter(), {
        exposeAccessToken: true,
      });
      const body = (await response.json()) as Record<string, unknown>;

      expect(body).toMatchObject({access_token: 'secret-access-token', scope: 'openid profile', token_type: 'Bearer'});
      expect(body).not.toHaveProperty('refresh_token');
    });
  });

  describe('organization unit switch', () => {
    it('reads the unit from the query or the JSON body', async () => {
      const adapter: FakeAdapter = createAdapter();

      await handle(sdkCall('/switch?ouId=ou-1', {method: 'POST'}), adapter);
      await handle(
        sdkCall('/switch', {
          body: JSON.stringify({ouId: 'ou-2'}),
          headers: {'content-type': 'application/json'},
          method: 'POST',
        }),
        adapter,
      );

      expect(adapter.switchOrganizationUnit).toHaveBeenNthCalledWith(1, expect.any(Request), 'ou-1');
      expect(adapter.switchOrganizationUnit).toHaveBeenNthCalledWith(2, expect.any(Request), 'ou-2');
    });

    it('answers a missing unit with 400 and a refusal with its OAuth error', async () => {
      const adapter: FakeAdapter = createAdapter();

      expect((await handle(sdkCall('/switch', {method: 'POST'}), adapter)).status).toBe(400);

      adapter.switchOrganizationUnit.mockResolvedValueOnce({error: 'interaction_required'});
      const refused: Response = await handle(sdkCall('/switch?ouId=ou-1', {method: 'POST'}), adapter);

      expect(refused.status).toBe(400);
      expect(await refused.json()).toEqual({error: 'interaction_required'});
    });
  });

  it('answers 500 without detail when the adapter fails', async () => {
    const adapter: FakeAdapter = createAdapter();

    adapter.getSession.mockRejectedValueOnce(new Error('store is down at 10.0.0.5'));
    const response: Response = await handle(sdkCall('/session'), adapter);

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('10.0.0.5');
  });

  it('answers 404 for an unknown endpoint or method', async () => {
    expect((await handle(sdkCall('/nope'), createAdapter())).status).toBe(404);
    expect((await handle(sdkCall('/session', {method: 'DELETE'}), createAdapter())).status).toBe(404);
  });
});

describe('toSafeReturnTo', () => {
  it('keeps only a path on the app', () => {
    expect(toSafeReturnTo('/orders?id=1')).toBe('/orders?id=1');
    expect(toSafeReturnTo('//evil.example')).toBe('/');
    expect(toSafeReturnTo('/\\evil.example')).toBe('/');
    expect(toSafeReturnTo('https://evil.example')).toBe('/');
    expect(toSafeReturnTo('/a\r\nSet-Cookie: x=y')).toBe('/');
    // A URL parser drops the tab, which would leave `//evil.example`.
    expect(toSafeReturnTo('/\t/evil.example')).toBe('/');
    expect(toSafeReturnTo('/\u0000/evil.example')).toBe('/');
    expect(toSafeReturnTo('/a\u007fb')).toBe('/');
    expect(toSafeReturnTo(undefined)).toBe('/');
  });
});

describe('getRequestOrigins', () => {
  it('adds the origin a reverse proxy forwards', () => {
    const request = new Request('http://10.0.0.5:3000/api/auth/signout', {
      headers: {'x-forwarded-host': 'app.example.com', 'x-forwarded-proto': 'https'},
    });

    expect(getRequestOrigins(request)).toEqual(['http://10.0.0.5:3000', 'https://app.example.com']);
  });

  it('has only the request origin without forwarded headers', () => {
    expect(getRequestOrigins(new Request(`${ORIGIN}/api/auth/session`))).toEqual([ORIGIN]);
  });
});
