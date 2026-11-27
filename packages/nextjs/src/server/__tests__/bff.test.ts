// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import SessionManager from '../../utils/SessionManager';
import thunderIDBff from '../bff';
import getClient from '../getClient';

/** A cookie jar standing in for `cookies()` from `next/headers`. */
class Jar {
  readonly values: Map<string, string> = new Map<string, string>();

  readonly deleted: {name: string; secure?: boolean}[] = [];

  delete(cookie: {name: string; secure?: boolean}): void {
    this.deleted.push(cookie);
    this.values.delete(cookie.name);
  }

  get(name: string): {value: string} | undefined {
    const value: string | undefined = this.values.get(name);

    return value === undefined ? undefined : {value};
  }

  getAll(): {name: string}[] {
    return [...this.values.keys()].map((name: string) => ({name}));
  }

  set(name: string, value: string): void {
    this.values.set(name, value);
  }
}

let jar: Jar;

vi.mock('next/headers', () => ({cookies: vi.fn(() => Promise.resolve(jar))}));
vi.mock('../getClient', () => ({default: vi.fn()}));

const ORIGIN = 'http://localhost:3000';

// An unsigned ID token: only its claims are read here.
const ID_TOKEN = `e30.${Buffer.from(JSON.stringify({email: 'a@example.com', nonce: 'n', sid: 's', sub: 'user-1'})).toString('base64url')}.`;

const sdkCall = (path: string, init: RequestInit = {}): Request =>
  new Request(`${ORIGIN}/api/auth${path}`, {
    ...init,
    headers: {'sec-fetch-site': 'same-origin', 'x-requested-with': 'XMLHttpRequest', ...(init.headers ?? {})},
  });

const signIn = async (ttlSeconds = 3600): Promise<void> => {
  jar.set(
    SessionManager.getSessionCookieName(),
    await SessionManager.createSessionToken(
      'secret-access-token',
      'user-1',
      'session-1',
      'openid',
      ttlSeconds,
      'rt',
      undefined,
      {
        idToken: ID_TOKEN,
        sid: 's',
      },
    ),
  );
};

describe('thunderIDBff (Next.js)', () => {
  let client: Record<string, Mock>;
  const {GET, POST} = thunderIDBff({apiBaseUrl: 'https://api.example.com'});

  beforeEach(() => {
    vi.stubEnv('THUNDERID_SESSION_SECRET', 'a-session-secret-that-is-at-least-32-bytes');
    jar = new Jar();
    client = {
      getAuthorizeRequestUrl: vi.fn().mockResolvedValue('https://idp.example.com/oauth2/authorize?x=1'),
      getConfiguration: vi.fn().mockResolvedValue({
        afterSignInUrl: `${ORIGIN}/api/auth/callback`,
        baseUrl: 'https://idp.example.com',
        clientId: 'c',
      }),
      getDecodedIdToken: vi.fn().mockResolvedValue({sid: 's', sub: 'user-1'}),
      signIn: vi.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        expiresIn: 3600,
        idToken: ID_TOKEN,
        refreshToken: 'rt',
        scope: 'openid',
      }),
    };
    Object.defineProperty(client, 'isInitialized', {value: true});
    (getClient as unknown as Mock).mockReturnValue(client);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('reports the user from the ID token in the cookie, without any token', async () => {
    await signIn();
    const response: Response = await GET(sdkCall('/session'));
    const text: string = await response.text();

    expect(JSON.parse(text)).toMatchObject({
      isSignedIn: true,
      scope: 'openid',
      user: {email: 'a@example.com', sub: 'user-1'},
    });
    expect((JSON.parse(text) as {user: object}).user).not.toHaveProperty('nonce');
    expect(text).not.toContain('secret-access-token');
  });

  it('reports a signed-out session without a cookie', async () => {
    expect(await (await GET(sdkCall('/session'))).json()).toEqual({isSignedIn: false});
    expect(await (await GET(sdkCall('/checksession'))).json()).toEqual({isSignedIn: false});
  });

  it('refuses a call without the request header', async () => {
    await signIn();

    expect((await GET(new Request(`${ORIGIN}/api/auth/session`))).status).toBe(403);
  });

  it('starts sign-in with a temporary cookie that remembers where to return', async () => {
    const response: Response = await GET(new Request(`${ORIGIN}/api/auth/signin?returnTo=/orders`));
    const temp: string | undefined = jar.get(SessionManager.getTempSessionCookieName())?.value;

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://idp.example.com/oauth2/authorize?x=1');
    expect(await SessionManager.verifyTempSession(temp ?? '')).toMatchObject({returnTo: '/orders'});
  });

  it('completes sign-in on the callback, writes the encrypted session and moves on from a page', async () => {
    jar.set(SessionManager.getTempSessionCookieName(), await SessionManager.createTempSession('session-1', '/orders'));

    const response: Response = await GET(new Request(`${ORIGIN}/api/auth/callback?code=c&state=s`));
    const session = await SessionManager.verifySessionToken(
      jar.get(SessionManager.getSessionCookieName())?.value ?? '',
    );

    expect(client.signIn).toHaveBeenCalledWith({code: 'c', state: 's'}, {}, 'session-1');
    // The session cookie is Strict, and a redirect from the callback would leave it out.
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('content="0;url=/orders"');
    expect(session).toMatchObject({accessToken: 'new-access-token', idToken: ID_TOKEN, sessionId: 'session-1'});
    expect(jar.get(SessionManager.getTempSessionCookieName())).toBeUndefined();
  });

  it('redirects from the callback when THUNDERID_SESSION_COOKIE_SAME_SITE is lax', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('THUNDERID_SESSION_COOKIE_SAME_SITE', 'lax');
    jar.set(SessionManager.getTempSessionCookieName(), await SessionManager.createTempSession('session-1', '/orders'));

    const response: Response = await GET(new Request(`${ORIGIN}/api/auth/callback?code=c&state=s`));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/orders');
    vi.unstubAllEnvs();
  });

  it('refreshes an expired access token when the session is read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({access_token: 'refreshed-token', expires_in: 3600, scope: 'openid'}), {
          status: 200,
        }),
      ),
    );
    await signIn(-10);

    const body = (await (await GET(sdkCall('/session'))).json()) as {isSignedIn: boolean};
    const session = await SessionManager.verifySessionToken(
      jar.get(SessionManager.getSessionCookieName())?.value ?? '',
    );

    expect(body.isSignedIn).toBe(true);
    expect(session.accessToken).toBe('refreshed-token');
    expect(session.idToken).toBe(ID_TOKEN);
  });

  it('answers a failed refresh with 401 login_required and clears the cookie', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', {status: 400})));
    await signIn(-10);

    const response: Response = await POST(sdkCall('/refresh', {method: 'POST'}));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({error: 'login_required'});
    expect(jar.get(SessionManager.getSessionCookieName())).toBeUndefined();
  });

  it('proxies an API call with the access token from the cookie', async () => {
    const apiFetch: Mock = vi.fn().mockResolvedValue(new Response('{"id":"u"}'));

    vi.stubGlobal('fetch', apiFetch);
    await signIn();

    await GET(sdkCall('/proxy/users/me'));
    const [target, init] = apiFetch.mock.calls[0] as [string, RequestInit];

    expect(target).toBe('https://api.example.com/users/me');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer secret-access-token');
  });
});
