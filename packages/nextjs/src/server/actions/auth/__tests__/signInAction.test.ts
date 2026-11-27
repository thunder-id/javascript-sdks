// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/node';
import {cookies} from 'next/headers';
import {beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import SessionManager from '../../../../utils/SessionManager';
import getClient from '../../../getClient';
import signInAction from '../signInAction';

vi.mock('next/headers', () => ({cookies: vi.fn()}));
vi.mock('../../../getClient', () => ({default: vi.fn()}));
vi.mock('../../../../utils/SessionManager', () => ({
  default: {
    createSessionToken: vi.fn(),
    createTempSession: vi.fn(),
    getSessionCookieName: vi.fn(),
    getSessionCookieOptions: vi.fn(),
    getTempSessionCookieName: vi.fn(),
    getTempSessionCookieOptions: vi.fn(),
    resolveSessionCookieExpiry: vi.fn(),
  },
}));

describe('signInAction', () => {
  let client: Record<string, Mock>;
  let cookieStore: Record<string, Mock>;

  beforeEach(() => {
    vi.resetAllMocks();
    client = {
      exchangeFlowAssertion: vi.fn(),
      getConfiguration: vi.fn().mockResolvedValue({}),
      getDecodedIdToken: vi.fn().mockResolvedValue({sid: 'sid-1', sub: 'user-1'}),
      getStorageManager: vi.fn().mockResolvedValue({getConfigDataParameter: vi.fn().mockResolvedValue('/home')}),
      signIn: vi.fn(),
    };
    (getClient as unknown as Mock).mockReturnValue(client);
    cookieStore = {delete: vi.fn(), get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn()};
    (cookies as unknown as Mock).mockResolvedValue(cookieStore);
    (SessionManager.createTempSession as unknown as Mock).mockResolvedValue('temp-token');
  });

  it("returns the server's error envelope and status for a refused step", async () => {
    client.signIn.mockRejectedValue(
      new ThunderIDAPIError(JSON.stringify({code: 'FES-1004', message: 'Invalid request'}), 'FLOW', 'node', 400),
    );

    const result = await signInAction({executionId: 'e-1'}, {});

    expect(result).toMatchObject({serverError: {code: 'FES-1004'}, statusCode: 400, success: false});
  });

  it('returns only the message for any other failure', async () => {
    client.signIn.mockRejectedValue(new Error('offline'));

    const result = await signInAction({executionId: 'e-1'}, {});

    expect(result).toEqual({error: 'offline', success: false});
  });

  describe('when the flow completes', () => {
    beforeEach(() => {
      client['signIn'].mockResolvedValue({assertion: 'flow-assertion', flowStatus: 'COMPLETE'});
      (SessionManager.getSessionCookieName as unknown as Mock).mockReturnValue('session');
      (SessionManager.createSessionToken as unknown as Mock).mockResolvedValue('session-token');
    });

    it('keeps the access token the assertion is exchanged for in the session', async () => {
      client['exchangeFlowAssertion'].mockResolvedValue({
        access_token: 'exchanged-at',
        expires_in: '900',
        id_token: 'flow-assertion',
        scope: 'self',
      });

      const result = await signInAction({executionId: 'e-1'}, {});

      expect(client['exchangeFlowAssertion']).toHaveBeenCalledWith('flow-assertion');
      expect((SessionManager.createSessionToken as unknown as Mock).mock.calls).toEqual([
        ['exchanged-at', 'user-1', expect.any(String), 'self', 900, '', undefined, {sid: 'sid-1'}],
      ]);
      expect(cookieStore['set']).toHaveBeenCalledWith('session', 'session-token', undefined);
      expect(result).toEqual({data: {afterSignInUrl: '/home'}, success: true});
    });

    it('sets no session when the assertion cannot be exchanged', async () => {
      client['exchangeFlowAssertion'].mockRejectedValue(new Error('needs the token exchange grant'));

      const result = await signInAction({executionId: 'e-1'}, {});

      expect((SessionManager.createSessionToken as unknown as Mock).mock.calls).toEqual([]);
      expect(result).toEqual({error: 'needs the token exchange grant', success: false});
    });
  });
});
