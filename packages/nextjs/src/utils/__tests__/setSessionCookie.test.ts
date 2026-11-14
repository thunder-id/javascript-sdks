// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import type ThunderIDNextClient from '../../ThunderIDNextClient';
import {setChunkedCookie} from '../chunkedCookie';
import SessionManager from '../SessionManager';
import setSessionCookie from '../setSessionCookie';

vi.mock('../SessionManager', () => ({
  default: {
    createSessionToken: vi.fn(),
    getSessionCookieName: vi.fn(),
    getSessionCookieOptions: vi.fn(),
    resolveSessionCookieExpiry: vi.fn(),
  },
}));

vi.mock('../chunkedCookie', () => ({setChunkedCookie: vi.fn()}));

describe('setSessionCookie', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (SessionManager.createSessionToken as unknown as Mock).mockResolvedValue('session-jwt');
    (SessionManager.getSessionCookieName as unknown as Mock).mockReturnValue('session');
    (SessionManager.getSessionCookieOptions as unknown as Mock).mockReturnValue({httpOnly: true});
    (SessionManager.resolveSessionCookieExpiry as unknown as Mock).mockReturnValue(3600);
  });

  it("writes the session cookie from the tokens' access token, scopes and ID token claims", async () => {
    const getDecodedIdToken: Mock = vi.fn().mockResolvedValue({sid: 'sid-2', sub: 'user-1', user_org: 'ou-globex'});
    const client = {getDecodedIdToken} as unknown as ThunderIDNextClient;
    const cookieStore = {set: vi.fn()} as never;

    await setSessionCookie(
      client,
      cookieStore,
      'session-1',
      {accessToken: 'unit-at', expiresIn: 3600, idToken: 'unit-id', refreshToken: 'unit-rt', scope: 'openid ou'},
      {sessionCookie: {expiryTime: 7200}} as never,
    );

    expect(getDecodedIdToken).toHaveBeenCalledWith('session-1', 'unit-id');
    expect(vi.mocked(SessionManager).resolveSessionCookieExpiry.mock.calls[0]).toEqual([7200]);
    expect(vi.mocked(SessionManager).createSessionToken.mock.calls[0]).toEqual([
      'unit-at',
      'user-1',
      'session-1',
      'openid ou',
      3600,
      'unit-rt',
      'ou-globex',
      {sid: 'sid-2'},
    ]);
    expect(setChunkedCookie).toHaveBeenCalledWith(cookieStore, 'session', 'session-jwt', {httpOnly: true});
  });
});
