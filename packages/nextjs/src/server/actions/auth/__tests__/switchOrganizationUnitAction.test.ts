// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {OrganizationUnitSwitchErrorCodes} from '@thunderid/node';
import {cookies} from 'next/headers';
import {beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import SessionManager from '../../../../utils/SessionManager';
import getClient from '../../../getClient';
import getSessionId from '../../getSessionId';
import signInAction from '../signInAction';
import switchOrganizationUnitAction from '../switchOrganizationUnitAction';

vi.mock('next/headers', () => ({cookies: vi.fn()}));
vi.mock('../../../getClient', () => ({default: vi.fn()}));
vi.mock('../../getSessionId', () => ({default: vi.fn()}));
vi.mock('../signInAction', () => ({default: vi.fn()}));
vi.mock('../../../../utils/SessionManager', () => ({
  default: {
    createTempSession: vi.fn(),
    getTempSessionCookieName: vi.fn(),
    getTempSessionCookieOptions: vi.fn(),
  },
}));

describe('switchOrganizationUnitAction', () => {
  let client: {getAuthorizeRequestUrl: Mock; getConfiguration: Mock; initialize: Mock; isInitialized: boolean};
  let cookieSet: Mock;

  beforeEach(() => {
    vi.resetAllMocks();
    cookieSet = vi.fn();
    client = {
      getAuthorizeRequestUrl: vi.fn().mockResolvedValue('https://localhost:8090/ou/ou-globex/oauth2/authorize?x=1'),
      getConfiguration: vi.fn().mockResolvedValue({applicationId: 'app-1', baseUrl: 'https://localhost:8090'}),
      initialize: vi.fn(),
      isInitialized: true,
    };
    (getClient as unknown as Mock).mockReturnValue(client);
    (getSessionId as unknown as Mock).mockResolvedValue('session-1');
    (cookies as unknown as Mock).mockResolvedValue({set: cookieSet});
    (SessionManager.getTempSessionCookieName as unknown as Mock).mockReturnValue('temp');
    (SessionManager.createTempSession as unknown as Mock).mockResolvedValue('temp-token');
    (SessionManager.getTempSessionCookieOptions as unknown as Mock).mockReturnValue({httpOnly: true});
  });

  it("returns the unit's authorization URL for the session and marks it for the callback", async () => {
    const result = await switchOrganizationUnitAction('ou-globex');

    expect(client.getAuthorizeRequestUrl).toHaveBeenCalledWith({organizationUnitId: 'ou-globex'}, 'session-1');
    expect(vi.mocked(SessionManager).createTempSession.mock.calls[0]).toEqual(['session-1']);
    expect(cookieSet).toHaveBeenCalledWith('temp', 'temp-token', {httpOnly: true});
    expect(result).toEqual({
      data: {signInUrl: 'https://localhost:8090/ou/ou-globex/oauth2/authorize?x=1'},
      success: true,
    });
  });

  it('refuses a missing unit and a missing session', async () => {
    expect(await switchOrganizationUnitAction('')).toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.InvalidOrganizationUnit,
      success: false,
    });

    (getSessionId as unknown as Mock).mockResolvedValue(undefined);

    expect(await switchOrganizationUnitAction('ou-globex')).toMatchObject({statusCode: 401, success: false});
    expect(client.getAuthorizeRequestUrl).not.toHaveBeenCalled();
  });

  it('fails with interaction_required instead of redirecting when redirect is false', async () => {
    expect(await switchOrganizationUnitAction('ou-globex', {redirect: false})).toEqual({
      code: OrganizationUnitSwitchErrorCodes.InteractionRequired,
      success: false,
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  describe('in embedded mode', () => {
    beforeEach(() => {
      client.getConfiguration.mockResolvedValue({applicationId: 'app-1', mode: 'embedded'});
    });

    it('starts a sign-in flow bounded to the unit and reports a completed switch', async () => {
      (signInAction as unknown as Mock).mockResolvedValue({data: {afterSignInUrl: '/'}, success: true});

      const result = await switchOrganizationUnitAction('ou-globex');

      expect(signInAction).toHaveBeenCalledWith({
        applicationId: 'app-1',
        flowType: 'AUTHENTICATION',
        ouId: 'ou-globex',
      });
      expect(result).toEqual({data: {switched: true}, success: true});
    });

    it('needs interaction when the flow asks for input', async () => {
      (signInAction as unknown as Mock).mockResolvedValue({data: {executionId: 'e-1'}, success: true});

      expect(await switchOrganizationUnitAction('ou-globex')).toEqual({
        code: OrganizationUnitSwitchErrorCodes.InteractionRequired,
        success: false,
      });
    });

    it('maps a unit the application cannot be used from to unauthorized_client', async () => {
      (signInAction as unknown as Mock).mockResolvedValue({
        error: 'FES-1023: invalid organization unit',
        success: false,
      });

      expect(await switchOrganizationUnitAction('ou-globex')).toEqual({
        code: OrganizationUnitSwitchErrorCodes.UnauthorizedClient,
        success: false,
      });
    });
  });
});
