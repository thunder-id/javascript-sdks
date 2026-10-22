// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {beforeEach, describe, expect, it, vi} from 'vitest';
import getClient from '../../getClient';
import getGrantedPermissionsAction from '../getGrantedPermissionsAction';
import getSessionId from '../getSessionId';

vi.mock('../getSessionId', () => ({default: vi.fn()}));
vi.mock('../../getClient', () => ({default: vi.fn()}));

const toJwt = (payload: Record<string, unknown>): string =>
  `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

const mockGetAccessToken = vi.fn();

describe('getGrantedPermissionsAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSessionId).mockResolvedValue('session-1');
    vi.mocked(getClient).mockReturnValue({getAccessToken: mockGetAccessToken} as unknown as ReturnType<
      typeof getClient
    >);
  });

  it("returns the permissions in the session's access token, not the token", async () => {
    const token: string = toJwt({scope: 'openid system:user:view system:group'});
    mockGetAccessToken.mockResolvedValue(token);

    const result: string[] = await getGrantedPermissionsAction();

    expect(mockGetAccessToken).toHaveBeenCalledWith('session-1');
    expect(result).toEqual(['openid', 'system:user:view', 'system:group']);
    expect(JSON.stringify(result)).not.toContain(token);
  });

  it('returns an empty list without a session', async () => {
    vi.mocked(getSessionId).mockResolvedValue(undefined);

    await expect(getGrantedPermissionsAction()).resolves.toEqual([]);
    expect(mockGetAccessToken).not.toHaveBeenCalled();
  });

  it('returns an empty list instead of throwing when the token cannot be read', async () => {
    mockGetAccessToken.mockRejectedValue(new Error('Failed to get access token.'));

    await expect(getGrantedPermissionsAction()).resolves.toEqual([]);
  });
});
