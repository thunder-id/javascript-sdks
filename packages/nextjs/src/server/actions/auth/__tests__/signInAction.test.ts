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
    createTempSession: vi.fn(),
    getSessionCookieName: vi.fn(),
    getTempSessionCookieName: vi.fn(),
    getTempSessionCookieOptions: vi.fn(),
  },
}));

describe('signInAction', () => {
  let client: {signIn: Mock};

  beforeEach(() => {
    vi.resetAllMocks();
    client = {signIn: vi.fn()};
    (getClient as unknown as Mock).mockReturnValue(client);
    (cookies as unknown as Mock).mockResolvedValue({get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn()});
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
});
