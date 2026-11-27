// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {getRequestHeaders, sendWebResponse, setResponseStatus, toWebRequest} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import bffHandler from '../../src/runtime/server/routes/auth/session/bff';
import {refuseCrossSiteRequest} from '../../src/runtime/server/utils/checkBffRequest';
import {useServerSession} from '../../src/runtime/server/utils/serverSession';
import {refreshServerSession} from '../../src/runtime/server/utils/token-refresh';

const ORIGIN = 'http://localhost:3000';

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  getRequestHeaders: vi.fn(),
  getRequestURL: vi.fn(() => new URL(`${ORIGIN}/api/auth/signout`)),
  sendWebResponse: vi.fn((_event: unknown, response: Response) => response),
  setResponseStatus: vi.fn(),
  toWebRequest: vi.fn(),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({public: {thunderid: {baseUrl: 'https://idp.example.com'}}})),
}));

vi.mock('../../src/runtime/server/utils/serverSession', () => ({useServerSession: vi.fn()}));
vi.mock('../../src/runtime/server/utils/token-refresh', () => ({refreshServerSession: vi.fn()}));
vi.mock('../../src/runtime/server/utils/chunkedCookie', () => ({deleteChunkedCookie: vi.fn()}));

const event = {};
const now = (): number => Math.floor(Date.now() / 1000);

const session = (accessTokenExpiresAt: number) => ({
  accessToken: 'secret-access-token',
  accessTokenExpiresAt,
  exp: now() + 86400,
  refreshToken: 'rt',
  scopes: 'openid',
  sub: 'user-1',
});

const sdkCall = (path: string, method = 'GET'): Request =>
  new Request(`${ORIGIN}/api/auth${path}`, {
    headers: {'sec-fetch-site': 'same-origin', 'x-requested-with': 'XMLHttpRequest'},
    method,
  });

const run = async (request: Request): Promise<Response> => {
  vi.mocked(toWebRequest).mockReturnValue(request);

  return (await (bffHandler as any)(event)) as Response;
};

describe('the Nuxt BFF route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports a live session without refreshing it', async () => {
    vi.mocked(useServerSession).mockResolvedValue(session(now() - 10) as any);

    const response: Response = await run(sdkCall('/checksession'));

    expect(await response.json()).toEqual({isSignedIn: true});
    expect(refreshServerSession).not.toHaveBeenCalled();
    expect(sendWebResponse).toHaveBeenCalled();
  });

  it('refreshes, or answers 401 login_required when there is nothing to refresh', async () => {
    vi.mocked(useServerSession).mockResolvedValue(session(now() - 10) as any);
    vi.mocked(refreshServerSession).mockResolvedValue(session(now() + 3600) as any);

    expect((await run(sdkCall('/refresh', 'POST'))).status).toBe(204);

    vi.mocked(useServerSession).mockResolvedValue(null);

    expect((await run(sdkCall('/refresh', 'POST'))).status).toBe(401);
  });

  it('proxies with a refreshed access token when the stored one has expired', async () => {
    const apiFetch = vi.fn().mockResolvedValue(new Response('{}'));

    vi.stubGlobal('fetch', apiFetch);
    vi.mocked(useServerSession).mockResolvedValue(session(now() - 10) as any);
    vi.mocked(refreshServerSession).mockResolvedValue({...session(now() + 3600), accessToken: 'fresh-token'} as any);

    await run(sdkCall('/proxy/users/me'));
    const [target, init] = apiFetch.mock.calls[0] as [string, RequestInit];

    expect(target).toBe('https://idp.example.com/users/me');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer fresh-token');
    vi.unstubAllGlobals();
  });

  it('refuses a call without the request header', async () => {
    vi.mocked(useServerSession).mockResolvedValue(session(now() + 3600) as any);

    expect((await run(new Request(`${ORIGIN}/api/auth/checksession`))).status).toBe(403);
  });
});

describe('refuseCrossSiteRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a same-origin call with the request header', () => {
    vi.mocked(getRequestHeaders).mockReturnValue({origin: ORIGIN, 'x-requested-with': 'XMLHttpRequest'});

    expect(refuseCrossSiteRequest({method: 'POST'} as any)).toBeUndefined();
    expect(setResponseStatus).not.toHaveBeenCalled();
  });

  it('refuses a call without the header, or from another origin, with 403', () => {
    vi.mocked(getRequestHeaders).mockReturnValue({});

    expect(refuseCrossSiteRequest({method: 'POST'} as any)).toMatchObject({error: 'forbidden'});

    vi.mocked(getRequestHeaders).mockReturnValue({
      origin: 'https://evil.example',
      'x-requested-with': 'XMLHttpRequest',
    });

    expect(refuseCrossSiteRequest({method: 'POST'} as any)).toMatchObject({error: 'forbidden'});
    expect(setResponseStatus).toHaveBeenCalledWith(expect.anything(), 403);
  });
});
