// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cookies} from 'next/headers';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import {deleteChunkedCookie, getChunkedCookie} from '../../../../utils/chunkedCookie';
import SessionManager from '../../../../utils/SessionManager';
import getClient from '../../../getClient';
import signOutAction from '../signOutAction';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('../../../getClient', () => ({
  default: vi.fn(),
}));

vi.mock('../../../../utils/SessionManager', () => ({
  default: {
    getSessionCookieName: vi.fn(),
    getSessionCookieOptions: vi.fn(),
    getTempSessionCookieName: vi.fn(),
    getTempSessionCookieOptions: vi.fn(),
    verifySessionTokenForRefresh: vi.fn(),
  },
}));

vi.mock('../../../../utils/chunkedCookie', async (importOriginal: () => Promise<object>) => ({
  ...(await importOriginal()),
  deleteChunkedCookie: vi.fn(),
  getChunkedCookie: vi.fn(),
}));

/** A session cookie whose payload carries `sessionId`, or no cookie at all. */
const withSession = (sessionId?: string): void => {
  (getChunkedCookie as unknown as Mock).mockReturnValue(sessionId ? 'sealed' : undefined);
  (SessionManager.verifySessionTokenForRefresh as unknown as Mock).mockResolvedValue({sessionId});
};

const END_SESSION_URL = 'https://localhost:8090/oauth2/logout?id_token_hint=id-token';

const COOKIE_OPTIONS = {httpOnly: true, maxAge: 0, path: '/', sameSite: 'lax' as const, secure: true};

describe('signOutAction', () => {
  let signOut: Mock;
  let deleteCookie: Mock;

  beforeEach(() => {
    vi.resetAllMocks();

    signOut = vi.fn().mockResolvedValue(END_SESSION_URL);
    deleteCookie = vi.fn();
    (getClient as unknown as Mock).mockReturnValue({signOut});
    (cookies as unknown as Mock).mockResolvedValue({delete: deleteCookie});
    (SessionManager.getSessionCookieName as unknown as Mock).mockReturnValue('session');
    (SessionManager.getTempSessionCookieName as unknown as Mock).mockReturnValue('temp');
    (SessionManager.getSessionCookieOptions as unknown as Mock).mockReturnValue(COOKIE_OPTIONS);
    (SessionManager.getTempSessionCookieOptions as unknown as Mock).mockReturnValue({...COOKIE_OPTIONS, maxAge: 900});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the end-session URL and clears the session cookies', async () => {
    withSession('session-1');

    const result = await signOutAction();

    expect(signOut).toHaveBeenCalledWith({}, 'session-1');
    expect(result).toEqual({data: {signOutUrl: END_SESSION_URL}, success: true});
    expect(deleteChunkedCookie).toHaveBeenCalledWith(expect.anything(), 'session', COOKIE_OPTIONS);
    expect(deleteCookie).toHaveBeenCalledWith({httpOnly: true, name: 'temp', path: '/', sameSite: 'lax', secure: true});
  });

  it('ends the server session when the access token has expired', async () => {
    withSession('session-1');

    await signOutAction();

    // Read without the expiry check, so an expired access token still identifies the session.
    expect(SessionManager.verifySessionTokenForRefresh as unknown as Mock).toHaveBeenCalledWith('sealed');
    expect(signOut).toHaveBeenCalledWith({}, 'session-1');
  });

  it('does not ask the server when the cookie cannot be read', async () => {
    (getChunkedCookie as unknown as Mock).mockReturnValue('tampered');
    (SessionManager.verifySessionTokenForRefresh as unknown as Mock).mockRejectedValue(new Error('undecryptable'));

    const result = await signOutAction();

    expect(signOut).not.toHaveBeenCalled();
    expect(result).toEqual({data: {signOutUrl: '/'}, success: true});
  });

  it('succeeds without a session, without asking the server', async () => {
    withSession();

    const result = await signOutAction();

    expect(signOut).not.toHaveBeenCalled();
    expect(result).toEqual({data: {signOutUrl: '/'}, success: true});
  });

  it('still clears the session cookies when sign-out fails', async () => {
    withSession('session-1');
    signOut.mockRejectedValue(new Error('network down'));

    const result = await signOutAction();

    expect(result).toEqual({error: 'network down', success: false});
    expect(deleteChunkedCookie).toHaveBeenCalledWith(expect.anything(), 'session', COOKIE_OPTIONS);
    expect(deleteCookie).toHaveBeenCalledWith({httpOnly: true, name: 'temp', path: '/', sameSite: 'lax', secure: true});
  });
});
