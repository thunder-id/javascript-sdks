// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDNodeClient} from '@thunderid/node';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import getSessionId from '../server/actions/getSessionId';
import ThunderIDNextClient from '../ThunderIDNextClient';

vi.mock('../server/actions/getSessionId', () => ({
  default: vi.fn(),
}));

const END_SESSION_URL =
  'https://localhost:8090/oauth2/logout?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000&id_token_hint=id-token';

describe('ThunderIDNextClient.signOut', () => {
  let client: ThunderIDNextClient;
  let baseSignOut: Mock;

  beforeEach(() => {
    client = new ThunderIDNextClient();
    vi.spyOn(client, 'getConfiguration').mockResolvedValue({afterSignOutUrl: 'http://localhost:3000'} as never);
    baseSignOut = vi.spyOn(ThunderIDNodeClient.prototype, 'signOut').mockResolvedValue(END_SESSION_URL) as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the end-session URL, so the server session ends too', async () => {
    const url = await client.signOut({}, 'session-1');

    expect(baseSignOut).toHaveBeenCalledWith('session-1');
    expect(url).toBe(END_SESSION_URL);
  });

  it('reads the session from the cookie when none is passed', async () => {
    (getSessionId as unknown as Mock).mockResolvedValue('session-2');

    const url = await client.signOut();

    expect(baseSignOut).toHaveBeenCalledWith('session-2');
    expect(url).toBe(END_SESSION_URL);
  });

  it('returns afterSignOutUrl without asking the server when no session exists', async () => {
    (getSessionId as unknown as Mock).mockResolvedValue(undefined);

    const url = await client.signOut();

    expect(baseSignOut).not.toHaveBeenCalled();
    expect(url).toBe('http://localhost:3000');
  });

  it('falls back to afterSignOutUrl when the server publishes no end-session endpoint', async () => {
    baseSignOut.mockRejectedValue(new Error('Sign-out endpoint not found.'));

    const url = await client.signOut({}, 'session-1');

    expect(url).toBe('http://localhost:3000');
  });

  it('rethrows any other failure', async () => {
    baseSignOut.mockRejectedValue(new Error('network down'));

    await expect(client.signOut({}, 'session-1')).rejects.toThrow('network down');
  });
});
