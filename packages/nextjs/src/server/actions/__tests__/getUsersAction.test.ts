// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/node';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import getClient from '../../getClient';
import getSessionId from '../getSessionId';
import getUsersAction from '../getUsersAction';

vi.mock('../getSessionId', () => ({default: vi.fn()}));
vi.mock('../../getClient', () => ({default: vi.fn()}));

const mockGetUsers = vi.fn();

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

describe('getUsersAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClient).mockReturnValue({getUsers: mockGetUsers} as unknown as ReturnType<typeof getClient>);
    vi.mocked(getSessionId).mockResolvedValue('session-1');
  });

  it('refuses without a session and never reaches the upstream directory', async () => {
    vi.mocked(getSessionId).mockResolvedValue(undefined);

    const result = await getUsersAction({limit: 30, offset: 0});

    expect(result).toEqual({messageKey: 'elements.fields.paged_select.load_error', success: false});
    expect(mockGetUsers).not.toHaveBeenCalled();
  });

  it('loads the page with the server-resolved session and returns only the normalized options', async () => {
    mockGetUsers.mockResolvedValue(usersPage);

    const result = await getUsersAction({filter: 'department eq "Engineering"', limit: 2, offset: 0});

    expect(mockGetUsers).toHaveBeenCalledWith(
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

  it('does not let the caller choose the session: extra request fields are ignored', async () => {
    mockGetUsers.mockResolvedValue(usersPage);

    await getUsersAction({limit: 2, offset: 0, sessionId: 'someone-elses-session'} as never);

    expect(mockGetUsers).toHaveBeenCalledWith({filter: undefined, limit: 2, offset: 0}, 'session-1');
  });

  it("carries a ThunderIDAPIError's message across the boundary instead of throwing", async () => {
    mockGetUsers.mockRejectedValue(new ThunderIDAPIError('Forbidden', 'getUsers-ResponseError-001', 'javascript', 403));

    const result = await getUsersAction({limit: 30, offset: 0});

    expect(result).toMatchObject({success: false, messageKey: 'elements.fields.paged_select.load_error'});
    expect((result as {message?: string}).message).toBeDefined();
  });

  it('does not leak the text of an unexpected error', async () => {
    mockGetUsers.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:8090'));

    const result = await getUsersAction({limit: 30, offset: 0});

    expect(result).toEqual({messageKey: 'elements.fields.paged_select.load_error', success: false});
  });
});
