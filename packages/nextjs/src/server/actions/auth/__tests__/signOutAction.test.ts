// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cookies} from 'next/headers';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import {deleteChunkedCookie} from '../../../../utils/chunkedCookie';
import SessionManager from '../../../../utils/SessionManager';
import getClient from '../../../getClient';
import getSessionId from '../../getSessionId';
import signOutAction from '../signOutAction';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('../../../getClient', () => ({
  default: vi.fn(),
}));

vi.mock('../../getSessionId', () => ({
  default: vi.fn(),
}));

vi.mock('../../../../utils/SessionManager', () => ({
  default: {
    getSessionCookieName: vi.fn(),
    getTempSessionCookieName: vi.fn(),
  },
}));

vi.mock('../../../../utils/chunkedCookie', () => ({
  deleteChunkedCookie: vi.fn(),
}));

const END_SESSION_URL = 'https://localhost:8090/oauth2/logout?id_token_hint=id-token';

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the end-session URL and clears the session cookies', async () => {
    (getSessionId as unknown as Mock).mockResolvedValue('session-1');

    const result = await signOutAction();

    expect(signOut).toHaveBeenCalledWith({}, 'session-1');
    expect(result).toEqual({data: {signOutUrl: END_SESSION_URL}, success: true});
    expect(deleteChunkedCookie).toHaveBeenCalledWith(expect.anything(), 'session');
    expect(deleteCookie).toHaveBeenCalledWith('temp');
  });

  it('succeeds without a session, without asking the server', async () => {
    (getSessionId as unknown as Mock).mockResolvedValue(undefined);

    const result = await signOutAction();

    expect(signOut).not.toHaveBeenCalled();
    expect(result).toEqual({data: {signOutUrl: '/'}, success: true});
  });

  it('still clears the session cookies when sign-out fails', async () => {
    (getSessionId as unknown as Mock).mockResolvedValue('session-1');
    signOut.mockRejectedValue(new Error('network down'));

    const result = await signOutAction();

    expect(result).toEqual({error: 'network down', success: false});
    expect(deleteChunkedCookie).toHaveBeenCalledWith(expect.anything(), 'session');
    expect(deleteCookie).toHaveBeenCalledWith('temp');
  });
});
