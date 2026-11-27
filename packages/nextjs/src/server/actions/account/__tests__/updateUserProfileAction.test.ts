// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/node';
import {beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import getClient from '../../../getClient';
import updateUserProfileAction from '../updateUserProfileAction';

vi.mock('../../../getClient', () => ({default: vi.fn()}));

describe('updateUserProfileAction', () => {
  const updateUserProfile: Mock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (getClient as unknown as Mock).mockReturnValue({updateUserProfile});
  });

  it('returns the updated user', async () => {
    updateUserProfile.mockResolvedValue({id: 'u-1'});

    expect(await updateUserProfileAction({payload: {email: 'a@example.com'}}, 's-1')).toEqual({
      data: {user: {id: 'u-1'}},
      error: '',
      success: true,
    });
    expect(updateUserProfile).toHaveBeenCalledWith({payload: {email: 'a@example.com'}}, 's-1');
  });

  it('returns the challenge when the change needs a more recent sign-in', async () => {
    updateUserProfile.mockRejectedValue(
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

    const result = await updateUserProfileAction({payload: {email: 'a@example.com'}});

    expect(result).toMatchObject({
      authenticationChallenge: {error: 'insufficient_user_authentication', maxAge: 180},
      success: false,
    });
  });

  it('returns no challenge for any other failure', async () => {
    updateUserProfile.mockRejectedValue(new Error('offline'));

    const result = await updateUserProfileAction({payload: {}});

    expect(result.success).toBe(false);
    expect(result).not.toHaveProperty('authenticationChallenge');
  });
});
