// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cookies} from 'next/headers';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import SessionManager from '../../../utils/SessionManager';
import getClient from '../../getClient';
import handleOAuthCallbackAction from '../handleOAuthCallbackAction';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('../../getClient', () => ({
  default: vi.fn(),
}));

vi.mock('../../../utils/SessionManager', () => ({
  default: {
    createSessionToken: vi.fn(),
    getSessionCookieName: vi.fn(),
    getSessionCookieOptions: vi.fn(),
    getTempSessionCookieName: vi.fn(),
    resolveSessionCookieExpiry: vi.fn(),
    verifyTempSession: vi.fn(),
  },
}));

vi.mock('../../../utils/chunkedCookie', () => ({
  setChunkedCookie: vi.fn(),
}));

interface FakeClient {
  getConfiguration: Mock;
  getDecodedIdToken: Mock;
  initialize: Mock;
  isInitialized: boolean;
  signIn: Mock;
}

describe('handleOAuthCallbackAction', () => {
  let client: FakeClient;

  beforeEach(() => {
    vi.resetAllMocks();

    client = {
      getConfiguration: vi.fn().mockResolvedValue({afterSignInUrl: '/home'}),
      getDecodedIdToken: vi.fn().mockResolvedValue({sub: 'user-1'}),
      initialize: vi.fn(),
      isInitialized: false,
      signIn: vi.fn().mockResolvedValue({accessToken: 'at', idToken: 'id', scope: 'openid'}),
    };
    (getClient as unknown as Mock).mockReturnValue(client);
    (cookies as unknown as Mock).mockResolvedValue({
      delete: vi.fn(),
      get: (): {value: string} => ({value: 'temp-token'}),
    });
    (SessionManager.getTempSessionCookieName as unknown as Mock).mockReturnValue('temp');
    (SessionManager.getSessionCookieName as unknown as Mock).mockReturnValue('session');
    (SessionManager.verifyTempSession as unknown as Mock).mockResolvedValue({sessionId: 'session-1'});
    (SessionManager.createSessionToken as unknown as Mock).mockResolvedValue('jwt');
    (SessionManager.resolveSessionCookieExpiry as unknown as Mock).mockReturnValue(3600);
    (SessionManager.getSessionCookieOptions as unknown as Mock).mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes the client from the environment when this module context has not been initialized', async () => {
    client.initialize.mockImplementation((): Promise<boolean> => {
      client.isInitialized = true;

      return Promise.resolve(true);
    });

    const result = await handleOAuthCallbackAction('code-1', 'state-1');

    expect(client.initialize).toHaveBeenCalledOnce();
    expect(client.signIn).toHaveBeenCalledWith(
      {code: 'code-1', session_state: undefined, state: 'state-1'},
      {},
      'session-1',
    );
    expect(result).toEqual({redirectUrl: '/home', success: true});
  });

  it('does not initialize again when the client already is', async () => {
    client.isInitialized = true;

    const result = await handleOAuthCallbackAction('code-1', 'state-1');

    expect(client.initialize).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('fails when the client cannot be initialized', async () => {
    client.initialize.mockResolvedValue(false);

    const result = await handleOAuthCallbackAction('code-1', 'state-1');

    expect(client.signIn).not.toHaveBeenCalled();
    expect(result).toEqual({error: 'ThunderID client is not initialized', success: false});
  });
});
