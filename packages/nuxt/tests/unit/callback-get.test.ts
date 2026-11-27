// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/explicit-function-return-type */

import {sendRedirect, setResponseHeader} from 'h3';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import callbackHandler from '../../src/runtime/server/routes/auth/session/callback.get';
import {getSessionCookieOptions, issueSessionCookie} from '../../src/runtime/server/utils/session';

const mockClientInstance = vi.hoisted(() => ({
  signIn: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('h3', () => ({
  createError: vi.fn((opts: {statusMessage: string}) => Object.assign(new Error(opts.statusMessage), opts)),
  defineEventHandler: (fn: unknown) => fn,
  deleteCookie: vi.fn(),
  getCookie: vi.fn(() => 'sealed-sign-in-cookie'),
  getQuery: vi.fn(() => ({code: 'auth-code', state: 'state-1'})),
  sendRedirect: vi.fn((_event: unknown, location: string) => `redirect:${location}`),
  setResponseHeader: vi.fn(),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    public: {thunderid: {afterSignInUrl: '/home'}},
    thunderid: {sessionSecret: 'test-secret-for-callback-route!!-32chars'},
  })),
}));

vi.mock('../../src/runtime/server/ThunderIDNuxtClient', () => ({
  default: {getInstance: () => mockClientInstance},
}));

vi.mock('../../src/runtime/server/utils/session', () => ({
  getSessionCookieOptions: vi.fn(),
  getTempSessionCookieName: vi.fn().mockReturnValue('thunderid-session-state'),
  getTempSessionCookieOptions: vi.fn().mockReturnValue({httpOnly: true, path: '/', sameSite: 'lax'}),
  issueSessionCookie: vi.fn().mockResolvedValue(undefined),
  verifyTempSessionToken: vi.fn().mockResolvedValue({returnTo: '/orders', sessionId: 'session-1'}),
}));

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientInstance.signIn.mockResolvedValue({accessToken: 'at', idToken: 'id'});
  });

  it('moves on from a page when the session cookie is Strict, so the browser sends it', async () => {
    vi.mocked(getSessionCookieOptions).mockReturnValue({
      httpOnly: true,
      maxAge: 60,
      path: '/',
      sameSite: 'strict',
      secure: false,
    });

    const result = await (callbackHandler as unknown as (event: unknown) => Promise<unknown>)({});

    expect(issueSessionCookie).toHaveBeenCalled();
    expect(sendRedirect).not.toHaveBeenCalled();
    expect(setResponseHeader).toHaveBeenCalledWith({}, 'content-type', 'text/html; charset=utf-8');
    expect(result).toContain('<meta http-equiv="refresh" content="0;url=/orders">');
  });

  it('redirects when the session cookie is Lax', async () => {
    vi.mocked(getSessionCookieOptions).mockReturnValue({
      httpOnly: true,
      maxAge: 60,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });

    const result = await (callbackHandler as unknown as (event: unknown) => Promise<unknown>)({});

    expect(result).toBe('redirect:/orders');
  });
});
