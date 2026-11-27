// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {ThunderIDAPIError} from '@thunderid/node';
import {readBody} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import profilePatchHandler from '../../src/runtime/server/routes/auth/user/profile.patch';
import {verifyAndRehydrateSession} from '../../src/runtime/server/utils/serverSession';

const mockClientInstance = vi.hoisted(() => ({
  updateUserProfile: vi.fn<(...args: any[]) => Promise<any>>(),
}));

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  readBody: vi.fn(),
  createError: vi.fn((opts: any) => Object.assign(new Error(opts.statusMessage), opts)),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({public: {thunderid: {}}, thunderid: {sessionSecret: 'test-secret'}})),
}));

vi.mock('../../src/runtime/server/ThunderIDNuxtClient', () => ({
  default: {getInstance: () => mockClientInstance},
}));

vi.mock('../../src/runtime/server/utils/serverSession', () => ({
  verifyAndRehydrateSession: vi.fn(),
}));

const body = {payload: {email: 'a@example.com'}};

describe('PATCH /api/auth/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue({sessionId: 'session-1'} as any);
    vi.mocked(readBody).mockResolvedValue(body);
  });

  it('returns the updated user', async () => {
    mockClientInstance.updateUserProfile.mockResolvedValue({id: 'u-1'});

    expect(await (profilePatchHandler as any)({})).toEqual({data: {user: {id: 'u-1'}}, error: '', success: true});
    expect(mockClientInstance.updateUserProfile).toHaveBeenCalledWith(body, 'session-1');
  });

  it('returns the challenge when the change needs a more recent sign-in', async () => {
    mockClientInstance.updateUserProfile.mockRejectedValue(
      new ThunderIDAPIError(
        JSON.stringify({code: 'AUTH-4011'}),
        'updateMeProfile-ResponseError-001',
        'javascript',
        401,
        'Unauthorized',
        undefined,
        'Bearer error="insufficient_user_authentication", max_age="180"',
      ),
    );

    expect(await (profilePatchHandler as any)({})).toMatchObject({
      authenticationChallenge: {error: 'insufficient_user_authentication', maxAge: 180},
      success: false,
    });
  });

  it('fails with 500 for any other error', async () => {
    mockClientInstance.updateUserProfile.mockRejectedValue(new Error('offline'));

    await expect((profilePatchHandler as any)({})).rejects.toMatchObject({statusCode: 500});
  });
});
