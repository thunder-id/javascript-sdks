// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import http from 'node:http';
import {AddressInfo} from 'node:net';
import express from 'express';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import thunderIDBff from '../middleware/bff';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

const SESSION_ID = 'session-1';
const COOKIE = 'thunderid-session';
const STATE_COOKIE = 'thunderid-session-state';

type StubClient = Record<string, Mock> & {expressConfig: Record<string, unknown>};

const createClient = (): StubClient =>
  ({
    endSession: vi.fn().mockResolvedValue(undefined),
    clearSessionCookie: vi.fn((res: express.Response) => res.clearCookie(COOKIE, {path: '/'})),
    clearSessionStateCookie: vi.fn((res: express.Response) => res.clearCookie(STATE_COOKIE, {path: '/'})),
    expressConfig: {
      afterSignInUrl: 'http://127.0.0.1/api/auth/callback',
      afterSignOutUrl: 'http://127.0.0.1/',
      baseUrl: 'https://idp.example.com',
    },
    getDecodedIdToken: vi.fn().mockResolvedValue({aud: 'c', email: 'a@example.com', nonce: 'n', sub: 'u'}),
    getSessionCookieName: vi.fn().mockReturnValue(COOKIE),
    getSessionCookieOptions: vi
      .fn()
      .mockReturnValue({httpOnly: true, maxAge: 1000, path: '/', sameSite: 'strict', secure: false}),
    getSessionStateCookieName: vi.fn().mockReturnValue(STATE_COOKIE),
    getSessionStateCookieOptions: vi
      .fn()
      .mockReturnValue({httpOnly: true, maxAge: 900_000, path: '/', sameSite: 'lax', secure: false}),
    getSignInUrl: vi.fn().mockResolvedValue('https://idp.example.com/oauth2/authorize?x=1'),
    getSessionData: vi.fn().mockResolvedValue({
      access_token: 'secret-access-token',
      created_at: 1_000_000_000_000,
      expires_in: '3600',
      scope: 'openid',
    }),
    isSignedIn: vi.fn().mockResolvedValue(true),
    refreshAccessToken: vi.fn().mockResolvedValue({}),
    signIn: vi.fn().mockResolvedValue({accessToken: 'at'}),
    signOut: vi.fn().mockResolvedValue('https://idp.example.com/oauth2/logout'),
    switchOrganizationUnitWithDeviceSecret: vi.fn().mockResolvedValue({tokenResponse: {}}),
  }) as unknown as StubClient;

describe('thunderIDBff', () => {
  let server: http.Server;
  let client: StubClient;
  let base: string;

  const call = (path: string, init: RequestInit = {}, sdk = true): Promise<Response> =>
    fetch(`${base}${path}`, {
      redirect: 'manual',
      ...init,
      headers: {
        cookie: `${COOKIE}=${SESSION_ID}`,
        ...(sdk ? {'x-requested-with': 'XMLHttpRequest'} : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });

  beforeEach(async () => {
    client = createClient();

    const app: express.Express = express();

    // A minimal stand-in for cookie-parser.
    app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.cookies = Object.fromEntries(
        (req.headers.cookie ?? '')
          .split(';')
          .filter(Boolean)
          .map((pair: string) => {
            const [name, value] = pair.trim().split('=') as [string, string];

            return [name, decodeURIComponent(value)];
          }),
      );
      (req as express.Request & {thunderIDAuth?: ThunderIDExpressClient}).thunderIDAuth =
        client as unknown as ThunderIDExpressClient;
      next();
    });
    app.use(express.urlencoded({extended: true}));
    app.use(thunderIDBff({apiBaseUrl: 'https://api.example.com'}));
    app.get('/elsewhere', (_req: express.Request, res: express.Response) => {
      res.send('app');
    });

    server = http.createServer(app);
    await new Promise<void>((resolve: () => void) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await new Promise<void>((resolve: () => void) => {
      server.close(() => resolve());
    });
  });

  it('passes requests outside /api/auth on to the app', async () => {
    expect(await (await call('/elsewhere')).text()).toBe('app');
  });

  it('reports the session without the token or the protocol claims', async () => {
    const response: Response = await call('/api/auth/session');
    const text: string = await response.text();

    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(JSON.parse(text)).toEqual({
      expiresAt: 1_000_003_600,
      isSignedIn: true,
      scope: 'openid',
      user: {email: 'a@example.com', sub: 'u'},
    });
    expect(text).not.toContain('secret-access-token');
  });

  it('refuses a call without the request header', async () => {
    expect((await call('/api/auth/session', {}, false)).status).toBe(403);
  });

  it('refuses a state-changing call from another origin', async () => {
    const response: Response = await call('/api/auth/signout', {
      headers: {origin: 'https://evil.example'},
      method: 'POST',
    });

    expect(response.status).toBe(403);
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('starts sign-in with the Lax sign-in and return-to cookies, keeping only a local returnTo', async () => {
    client.isSignedIn.mockResolvedValue(false);
    const response: Response = await call('/api/auth/signin?returnTo=/orders&ouId=ou-1', {}, false);
    const cookies: string[] = response.headers.getSetCookie();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://idp.example.com/oauth2/authorize?x=1');
    expect(client.getSignInUrl).toHaveBeenCalledWith({organizationUnitId: 'ou-1'}, SESSION_ID);
    expect(
      cookies.some(
        (cookie: string) => cookie.startsWith(`${STATE_COOKIE}=${SESSION_ID}`) && cookie.includes('SameSite=Lax'),
      ),
    ).toBe(true);
    // The session cookie is set only when sign-in completes.
    expect(cookies.some((cookie: string) => cookie.startsWith(`${COOKIE}=`))).toBe(false);
    expect(cookies.some((cookie: string) => cookie.startsWith('thunderid-return-to=%2Forders'))).toBe(true);
  });

  it('sends a signed-in user straight back to returnTo', async () => {
    const response: Response = await call('/api/auth/signin?returnTo=/orders', {}, false);

    expect(response.headers.get('location')).toBe('/orders');
    expect(client.getSignInUrl).not.toHaveBeenCalled();
  });

  it('completes sign-in on the callback and moves on from a page, so the Strict session cookie is sent', async () => {
    // Only the Lax cookies come back on the identity provider's redirect.
    const response: Response = await call(
      '/api/auth/callback?code=c&state=s',
      {headers: {cookie: `${STATE_COOKIE}=${SESSION_ID}; thunderid-return-to=%2Forders`}},
      false,
    );

    expect(client.signIn).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(await response.text()).toContain('<meta http-equiv="refresh" content="0;url=/orders">');
  });

  it('redirects from the callback when the session cookie is Lax', async () => {
    client.getSessionCookieOptions.mockReturnValue({
      httpOnly: true,
      maxAge: 1000,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
    const response: Response = await call(
      '/api/auth/callback?code=c&state=s',
      {headers: {cookie: `${STATE_COOKIE}=${SESSION_ID}; thunderid-return-to=%2Forders`}},
      false,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/orders');
  });

  it('does not complete a callback without a sign-in in progress', async () => {
    const response: Response = await call('/api/auth/callback?code=c&state=s', {}, false);

    expect(client.signIn).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('/');
  });

  it('checks the session without refreshing it', async () => {
    const response: Response = await call('/api/auth/checksession');

    expect(await response.json()).toEqual({isSignedIn: true});
    expect(client.isSignedIn).not.toHaveBeenCalled();
    expect(client.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes, or answers 401 login_required when it cannot', async () => {
    expect((await call('/api/auth/refresh', {method: 'POST'})).status).toBe(204);

    client.refreshAccessToken.mockRejectedValueOnce(new Error('invalid_grant'));
    const failed: Response = await call('/api/auth/refresh', {method: 'POST'});

    expect(failed.status).toBe(401);
    expect(await failed.json()).toEqual({error: 'login_required'});
    expect(client.clearSessionCookie).toHaveBeenCalled();
  });

  it('ends the stored session when a refresh fails, so checksession agrees with the 401', async () => {
    let stored = true;

    client.getSessionData.mockImplementation(() =>
      Promise.resolve(stored ? {access_token: 'at', created_at: 0, expires_in: '3600', scope: 'openid'} : undefined),
    );
    client.endSession.mockImplementation(() => {
      stored = false;

      return Promise.resolve();
    });
    client.refreshAccessToken.mockRejectedValueOnce(new Error('invalid_grant'));

    expect((await call('/api/auth/refresh', {method: 'POST'})).status).toBe(401);
    expect(await (await call('/api/auth/checksession')).json()).toEqual({isSignedIn: false});
  });

  it('reports a failure to end the session instead of hiding it', async () => {
    client.refreshAccessToken.mockRejectedValueOnce(new Error('invalid_grant'));
    client.endSession.mockRejectedValueOnce(new Error('store unavailable'));

    const response: Response = await call('/api/auth/refresh', {method: 'POST'});

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({error: 'server_error'});
  });

  it('signs out, clears the cookie and the session, and returns the end-session URL', async () => {
    const response: Response = await call('/api/auth/signout', {method: 'POST'});

    expect(await response.json()).toEqual({redirectUrl: 'https://idp.example.com/oauth2/logout'});
    expect(client.clearSessionCookie).toHaveBeenCalled();
    expect(client.endSession).toHaveBeenCalledWith(SESSION_ID);
  });

  it('switches the organization unit with the device secret', async () => {
    const response: Response = await call('/api/auth/switch', {
      body: JSON.stringify({ouId: 'ou-2'}),
      headers: {'content-type': 'application/json'},
      method: 'POST',
    });

    expect(response.status).toBe(200);
    expect(client.switchOrganizationUnitWithDeviceSecret).toHaveBeenCalledWith('ou-2', SESSION_ID);
  });

  it('asks for sign-in for the unit when the session holds no device secret', async () => {
    client.switchOrganizationUnitWithDeviceSecret.mockResolvedValueOnce(undefined);
    const response: Response = await call('/api/auth/switch?ouId=ou-2', {method: 'POST'});

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({error: 'interaction_required'});
  });

  it('proxies an API call with the access token', async () => {
    const realFetch: typeof fetch = fetch;
    const apiFetch: Mock = vi
      .fn()
      .mockResolvedValue(new Response('{"id":"u"}', {headers: {'content-type': 'application/json'}}));

    vi.stubGlobal(
      'fetch',
      (input: string | URL, init?: RequestInit): Promise<Response> =>
        String(input).startsWith('https://api.example.com')
          ? (apiFetch(input, init) as Promise<Response>)
          : realFetch(input, init),
    );

    const response: Response = await call('/api/auth/proxy/users/me');
    const [target, init] = apiFetch.mock.calls[0] as [string, RequestInit];

    expect(await response.json()).toEqual({id: 'u'});
    expect(target).toBe('https://api.example.com/users/me');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer secret-access-token');
  });

  describe('the proxy', () => {
    let apiFetch: Mock;

    beforeEach(() => {
      const realFetch: typeof fetch = fetch;

      apiFetch = vi.fn();
      vi.stubGlobal(
        'fetch',
        (input: string | URL, init?: RequestInit): Promise<Response> =>
          String(input).startsWith('https://api.example.com')
            ? (apiFetch(input, init) as Promise<Response>)
            : realFetch(input, init),
      );
    });

    it('forwards a form a body parser already read as a form', async () => {
      apiFetch.mockResolvedValue(new Response(null, {status: 204}));

      const response: Response = await call('/api/auth/proxy/forms', {
        body: 'name=Alice&tag=a&tag=b',
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        method: 'POST',
      });

      expect(response.status).toBe(204);

      const [, init] = apiFetch.mock.calls[0] as [string, RequestInit];

      expect(new Headers(init.headers).get('content-type')).toBe('application/x-www-form-urlencoded');
      expect(await new Response(init.body).text()).toBe('name=Alice&tag=a&tag=b');
    });

    it('keeps nested fields the extended parser read', async () => {
      apiFetch.mockResolvedValue(new Response(null, {status: 204}));
      const sent = 'profile[name]=Alice&profile[tags][0]=x&profile[tags][1]=y&items[0][id]=1';

      await call('/api/auth/proxy/forms', {
        body: sent,
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        method: 'POST',
      });

      const [, init] = apiFetch.mock.calls[0] as [string, RequestInit];

      expect(decodeURIComponent(await new Response(init.body).text())).toBe(sent);
    });

    it('streams the response, so events reach the browser before the API closes the stream', async () => {
      let push!: (chunk: string) => void;
      let close!: () => void;

      apiFetch.mockResolvedValue(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller: ReadableStreamDefaultController<Uint8Array>): void {
              push = (chunk: string): void => controller.enqueue(new Uint8Array(Buffer.from(chunk)));
              close = (): void => controller.close();
            },
          }),
          {headers: {'content-type': 'text/event-stream'}},
        ),
      );

      const response: Response = await call('/api/auth/proxy/events');
      const reader: ReadableStreamDefaultReader<Uint8Array> = response.body!.getReader();

      push('data: first\n\n');

      expect(Buffer.from((await reader.read()).value!).toString()).toBe('data: first\n\n');

      close();
      await reader.cancel();
    });
  });
});
