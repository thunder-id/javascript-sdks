// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render} from '@testing-library/react';
import {FetchUsers} from '@thunderid/browser';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import InviteUser from '../InviteUser';

const mocks = vi.hoisted(() => ({
  baseProps: {} as {fetchUsers?: FetchUsers},
  getUsers: vi.fn(),
  thunderID: {
    baseUrl: 'https://thunder.example',
    endpoints: undefined as {users?: string} | undefined,
    getAccessToken: vi.fn(),
    http: {request: vi.fn()},
    isInitialized: true,
  },
}));

vi.mock('../BaseInviteUser', () => ({
  default: (props: {fetchUsers?: FetchUsers}): null => {
    mocks.baseProps = props;
    return null;
  },
}));
vi.mock('@thunderid/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@thunderid/browser')>()),
  getUsers: mocks.getUsers,
}));
vi.mock('../../../../../contexts/ThunderID/useThunderID', () => ({default: () => mocks.thunderID}));

const usersResponse = {
  count: 2,
  links: [],
  startIndex: 31,
  totalResults: 75,
  users: [
    {display: 'Ada Lovelace', id: 'user-1'},
    {display: 'Grace Hopper', id: 'user-2'},
  ],
};

describe('InviteUser USER_SELECT data source', () => {
  beforeEach(() => {
    mocks.baseProps = {};
    mocks.thunderID.endpoints = undefined;
    mocks.getUsers.mockReset().mockResolvedValue(usersResponse);
  });

  it('hands BaseInviteUser a data source for USER_SELECT fields', () => {
    render(<InviteUser />);

    expect(mocks.baseProps.fetchUsers).toBeTypeOf('function');
  });

  it('pages the user directory from the base URL and turns the response into a picker page', async () => {
    render(<InviteUser />);
    const signal = new AbortController().signal;

    const page = await mocks.baseProps.fetchUsers!({
      component: {id: 'owner_input', type: 'USER_SELECT'},
      filter: undefined,
      limit: 30,
      offset: 30,
      signal,
    });

    const anyFetcher: unknown = expect.any(Function);
    expect(mocks.getUsers).toHaveBeenCalledWith({
      baseUrl: 'https://thunder.example',
      fetcher: anyFetcher,
      filter: undefined,
      limit: 30,
      offset: 30,
      signal,
      url: undefined,
    });
    expect(page.nextOffset).toBe(32);
    expect(page.totalResults).toBe(75);
    expect(page.options).toEqual([
      {label: 'Ada Lovelace', value: 'user-1'},
      {label: 'Grace Hopper', value: 'user-2'},
    ]);
  });

  it('honors the `users` endpoint override', async () => {
    mocks.thunderID.endpoints = {users: 'https://resources.example/users'};
    render(<InviteUser />);

    await mocks.baseProps.fetchUsers!({
      component: {id: 'owner_input', type: 'USER_SELECT'},
      limit: 30,
      offset: 0,
      signal: new AbortController().signal,
    });

    expect(mocks.getUsers).toHaveBeenCalledWith(expect.objectContaining({url: 'https://resources.example/users'}));
  });

  it('keeps the same data source across re-renders so an open picker keeps its list', () => {
    mocks.thunderID.endpoints = {users: 'https://resources.example/users'};
    const {rerender} = render(<InviteUser />);
    const first = mocks.baseProps.fetchUsers;

    mocks.thunderID.endpoints = {users: 'https://resources.example/users'};
    rerender(<InviteUser />);

    expect(mocks.baseProps.fetchUsers).toBe(first);
  });
});
