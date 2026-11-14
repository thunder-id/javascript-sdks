// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/explicit-function-return-type */

import {OrganizationUnitSwitchErrorCodes} from '@thunderid/browser';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import switchOrganizationUnitOnServer from '../../src/runtime/utils/switchOrganizationUnitOnServer';

const fetchMock = vi.fn();
const refusal = (statusCode: number, error?: string) =>
  Object.assign(new Error('refused'), {data: error ? {error} : undefined, statusCode});

describe('switchOrganizationUnitOnServer', () => {
  beforeEach(() => {
    vi.stubGlobal('$fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts the unit to the switch route and returns the new auth state', async () => {
    const state = {isLoading: false, isSignedIn: true, user: {sub: 'user-1'}};
    fetchMock.mockResolvedValue(state);

    await expect(switchOrganizationUnitOnServer('ou-2')).resolves.toEqual(state);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/switch', {
      body: {ouId: 'ou-2'},
      method: 'POST',
      query: {ouId: 'ou-2'},
    });
  });

  it.each([
    [400, 'interaction_required'],
    [400, 'login_required'],
    [400, 'invalid_grant'],
    [400, 'invalid_request'],
    [401, 'login_required'],
    [401, undefined],
  ])('asks for a sign-in on %s %s', async (statusCode: number, error?: string) => {
    fetchMock.mockRejectedValue(refusal(statusCode, error));

    await expect(switchOrganizationUnitOnServer('ou-2')).resolves.toBeUndefined();
  });

  it('fails with UnauthorizedClient on unauthorized_client and with Failed otherwise', async () => {
    fetchMock.mockRejectedValueOnce(refusal(400, 'unauthorized_client'));
    await expect(switchOrganizationUnitOnServer('ou-2')).rejects.toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.UnauthorizedClient,
    });

    fetchMock.mockRejectedValueOnce(refusal(502, 'server_error'));
    await expect(switchOrganizationUnitOnServer('ou-2')).rejects.toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.Failed,
    });

    fetchMock.mockRejectedValueOnce(new TypeError('network'));
    await expect(switchOrganizationUnitOnServer('ou-2')).rejects.toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.Failed,
    });
  });
});
