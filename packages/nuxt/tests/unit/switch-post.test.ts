// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {getQuery, readBody, setResponseStatus} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import switchHandler from '../../src/runtime/server/routes/auth/session/switch.post';
import {verifyAndRehydrateSession} from '../../src/runtime/server/utils/serverSession';
import {issueSessionCookie} from '../../src/runtime/server/utils/session';

const mockClientInstance = vi.hoisted(() => ({
  getCurrentOrganizationUnit: vi.fn<(...args: any[]) => Promise<any>>(),
  getDecodedIdToken: vi.fn<(...args: any[]) => Promise<any>>(),
  getUser: vi.fn<(...args: any[]) => Promise<any>>(),
  switchOrganizationUnitWithDeviceSecret: vi.fn<(...args: any[]) => Promise<any>>(),
}));

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  getQuery: vi.fn(),
  readBody: vi.fn(),
  setResponseStatus: vi.fn(),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({thunderid: {sessionSecret: 'test-secret'}})),
}));

vi.mock('../../src/runtime/server/ThunderIDNuxtClient', () => ({
  default: {getInstance: () => mockClientInstance},
}));

vi.mock('../../src/runtime/server/utils/serverSession', () => ({
  verifyAndRehydrateSession: vi.fn(),
}));

vi.mock('../../src/runtime/server/utils/session', () => ({
  issueSessionCookie: vi.fn(),
}));

const event = {};
const tokenResponse = {accessToken: 'unit-at', idToken: 'unit-id', scope: 'openid ou'};

describe('POST /api/auth/switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getQuery).mockReturnValue({ouId: 'ou-2'});
    vi.mocked(readBody).mockResolvedValue({ouId: 'ou-2'});
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue({sessionId: 'session-1'} as any);
    mockClientInstance.getDecodedIdToken.mockResolvedValue({sub: 'user-1'});
    mockClientInstance.getCurrentOrganizationUnit.mockResolvedValue({handle: 'globex', id: 'ou-2', name: 'Globex'});
    mockClientInstance.getUser.mockResolvedValue({sub: 'user-1'});
  });

  it("switches with the session's device secret, rewrites the session cookie and returns the new state", async () => {
    mockClientInstance.switchOrganizationUnitWithDeviceSecret.mockResolvedValue({tokenResponse});

    await expect((switchHandler as any)(event)).resolves.toEqual({
      isLoading: false,
      isSignedIn: true,
      organizationId: undefined,
      organizationUnit: {handle: 'globex', id: 'ou-2', name: 'Globex'},
      scopes: 'openid ou',
      user: {sub: 'user-1'},
    });
    expect(mockClientInstance.switchOrganizationUnitWithDeviceSecret).toHaveBeenCalledWith('ou-2', 'session-1');
    expect(issueSessionCookie).toHaveBeenCalledWith(event, 'session-1', tokenResponse, 'test-secret');
    expect(setResponseStatus).not.toHaveBeenCalled();
  });

  it('reads the unit from the body when the query has none', async () => {
    vi.mocked(getQuery).mockReturnValue({});
    mockClientInstance.switchOrganizationUnitWithDeviceSecret.mockResolvedValue({tokenResponse});

    await (switchHandler as any)(event);

    expect(mockClientInstance.switchOrganizationUnitWithDeviceSecret).toHaveBeenCalledWith('ou-2', 'session-1');
  });

  it('refuses a missing unit with invalid_request', async () => {
    vi.mocked(getQuery).mockReturnValue({});
    vi.mocked(readBody).mockResolvedValue(undefined);

    await expect((switchHandler as any)(event)).resolves.toEqual({error: 'invalid_request'});
    expect(setResponseStatus).toHaveBeenCalledWith(event, 400);
    expect(mockClientInstance.switchOrganizationUnitWithDeviceSecret).not.toHaveBeenCalled();
  });

  it('answers 401 with login_required without a session', async () => {
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue(null as any);

    await expect((switchHandler as any)(event)).resolves.toEqual({error: 'login_required'});
    expect(setResponseStatus).toHaveBeenCalledWith(event, 401);
    expect(mockClientInstance.switchOrganizationUnitWithDeviceSecret).not.toHaveBeenCalled();
  });

  it('answers interaction_required when the session holds no device secret', async () => {
    mockClientInstance.switchOrganizationUnitWithDeviceSecret.mockResolvedValue(undefined);

    await expect((switchHandler as any)(event)).resolves.toEqual({error: 'interaction_required'});
    expect(setResponseStatus).toHaveBeenCalledWith(event, 400);
    expect(issueSessionCookie).not.toHaveBeenCalled();
  });

  it("passes on the token endpoint's error and keeps the session", async () => {
    mockClientInstance.switchOrganizationUnitWithDeviceSecret.mockResolvedValue({error: 'unauthorized_client'});

    await expect((switchHandler as any)(event)).resolves.toEqual({error: 'unauthorized_client'});
    expect(setResponseStatus).toHaveBeenCalledWith(event, 400);
    expect(issueSessionCookie).not.toHaveBeenCalled();
  });

  it('answers server_error when the token endpoint cannot be reached', async () => {
    mockClientInstance.switchOrganizationUnitWithDeviceSecret.mockRejectedValue(new Error('network'));

    await expect((switchHandler as any)(event)).resolves.toEqual({error: 'server_error'});
    expect(setResponseStatus).toHaveBeenCalledWith(event, 502);
    expect(issueSessionCookie).not.toHaveBeenCalled();
  });
});
