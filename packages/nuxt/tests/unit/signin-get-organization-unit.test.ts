// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/explicit-function-return-type */

import {getQuery, sendRedirect} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import signInHandler from '../../src/runtime/server/routes/auth/session/signin.get';

const mockClientInstance = vi.hoisted(() => ({
  signIn: vi.fn<(...args: any[]) => Promise<any>>(),
}));

vi.mock('@thunderid/node', () => ({generateSessionId: () => 'session-new'}));

vi.mock('h3', () => ({
  createError: vi.fn((opts: any) => Object.assign(new Error(opts.statusMessage), opts)),
  defineEventHandler: (fn: Function) => fn,
  getQuery: vi.fn(),
  sendRedirect: vi.fn((_event: unknown, url: string) => url),
  setCookie: vi.fn(),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({thunderid: {sessionSecret: 'test-secret'}})),
}));

vi.mock('../../src/runtime/server/ThunderIDNuxtClient', () => ({
  default: {getInstance: () => mockClientInstance},
}));

vi.mock('../../src/runtime/server/utils/session', () => ({
  createTempSessionToken: vi.fn(async () => 'temp-token'),
  getTempSessionCookieName: () => 'temp',
  getTempSessionCookieOptions: () => ({}),
}));

describe('GET /api/auth/signin organization unit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientInstance.signIn.mockImplementation(async (callback: (url: string) => void) => {
      callback('https://localhost:8090/ou/ou-1/oauth2/authorize?client_id=c');
    });
  });

  it('bounds the sign-in to the unit in `ouId`', async () => {
    vi.mocked(getQuery).mockReturnValue({ouId: 'ou-1', returnTo: '/dashboard'});

    await (signInHandler as any)({});

    expect(mockClientInstance.signIn).toHaveBeenCalledWith(expect.any(Function), 'session-new', undefined, undefined, {
      organizationUnitId: 'ou-1',
    });
    expect(sendRedirect).toHaveBeenCalledWith({}, 'https://localhost:8090/ou/ou-1/oauth2/authorize?client_id=c', 302);
  });

  it('starts an unbounded sign-in without `ouId`, as before', async () => {
    vi.mocked(getQuery).mockReturnValue({});

    await (signInHandler as any)({});

    expect(mockClientInstance.signIn).toHaveBeenCalledWith(
      expect.any(Function),
      'session-new',
      undefined,
      undefined,
      {},
    );
  });
});
