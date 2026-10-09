// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {ThunderIDAPIError} from '@thunderid/node';
import {getQuery} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import usersHandler from '../../src/runtime/server/routes/auth/user/users.get';
import {verifyAndRehydrateSession} from '../../src/runtime/server/utils/serverSession';

// ── vi.hoisted ────────────────────────────────────────────────────────────────
const mockClientInstance = vi.hoisted(() => ({
  getUsers: vi.fn<(...args: any[]) => Promise<any>>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  getQuery: vi.fn(),
  createError: vi.fn((opts: any) => Object.assign(new Error(opts.statusMessage), opts)),
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockEvent = {};

const usersPage = {
  count: 2,
  links: [],
  startIndex: 0,
  totalResults: 5,
  users: [
    {display: 'Jane Doe', id: 'user-1'},
    {display: 'John Roe', id: 'user-2'},
  ],
};

const GENERIC_KEY = 'elements.fields.paged_select.load_error';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/auth/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue({sessionId: 'session-1'} as any);
    vi.mocked(getQuery).mockReturnValue({});
  });

  it('rejects an invalid or missing session with 401 and never calls the directory', async () => {
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue(null as any);

    await expect((usersHandler as any)(mockEvent)).rejects.toMatchObject({statusCode: 401});
    expect(mockClientInstance.getUsers).not.toHaveBeenCalled();
  });

  it('loads a page with the server-resolved session and returns only the normalized options', async () => {
    vi.mocked(getQuery).mockReturnValue({filter: 'department eq "Engineering"', limit: '2', offset: '0'});
    mockClientInstance.getUsers.mockResolvedValue(usersPage);

    const result = await (usersHandler as any)(mockEvent);

    expect(mockClientInstance.getUsers).toHaveBeenCalledWith(
      {filter: 'department eq "Engineering"', limit: 2, offset: 0},
      'session-1',
    );
    expect(result).toEqual({
      page: {
        nextOffset: 2,
        options: [
          {label: 'Jane Doe', value: 'user-1'},
          {label: 'John Roe', value: 'user-2'},
        ],
        totalResults: 5,
      },
      success: true,
    });
  });

  it('treats every query parameter as optional', async () => {
    mockClientInstance.getUsers.mockResolvedValue(usersPage);

    await (usersHandler as any)(mockEvent);

    expect(mockClientInstance.getUsers).toHaveBeenCalledWith(
      {filter: undefined, limit: undefined, offset: undefined},
      'session-1',
    );
  });

  it('ignores a session or URL smuggled in through the query string', async () => {
    vi.mocked(getQuery).mockReturnValue({sessionId: 'someone-elses-session', url: 'https://evil.example/users'});
    mockClientInstance.getUsers.mockResolvedValue(usersPage);

    await (usersHandler as any)(mockEvent);

    expect(mockClientInstance.getUsers).toHaveBeenCalledWith(
      {filter: undefined, limit: undefined, offset: undefined},
      'session-1',
    );
  });

  it.each([
    ['a non-numeric limit', {limit: 'abc'}],
    ['a negative offset', {offset: '-1'}],
    ['a fractional limit', {limit: '1.5'}],
    ['a repeated limit', {limit: ['1', '2']}],
    ['a repeated filter', {filter: ['a', 'b']}],
    ['an oversized filter', {filter: 'x'.repeat(513)}],
  ])('rejects %s with 400 before reaching the directory', async (_label, query) => {
    vi.mocked(getQuery).mockReturnValue(query);

    await expect((usersHandler as any)(mockEvent)).rejects.toMatchObject({statusCode: 400});
    expect(mockClientInstance.getUsers).not.toHaveBeenCalled();
  });

  it("carries a ThunderIDAPIError's message in the body of a 200 instead of throwing", async () => {
    mockClientInstance.getUsers.mockRejectedValue(
      new ThunderIDAPIError('Forbidden', 'getUsers-ResponseError-001', 'javascript', 403),
    );

    const result = await (usersHandler as any)(mockEvent);

    expect(result).toMatchObject({success: false, messageKey: GENERIC_KEY});
    expect(result.message).toBeDefined();
  });

  it('does not leak the text of an unexpected error', async () => {
    mockClientInstance.getUsers.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:8090'));

    const result = await (usersHandler as any)(mockEvent);

    expect(result).toEqual({messageKey: GENERIC_KEY, success: false});
  });
});
