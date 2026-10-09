// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {FetchUsers} from '@thunderid/browser';
import {mount} from '@vue/test-utils';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import InviteUser from '../../components/presentation/invite-user/InviteUser';

const mocks = vi.hoisted(() => ({
  baseProps: {} as {fetchUsers?: FetchUsers},
  getUsers: vi.fn(),
  thunderID: {
    baseUrl: 'https://thunder.example',
    endpoints: undefined as {users?: string} | undefined,
    http: {request: vi.fn()},
    isInitialized: {value: true},
  },
}));

// A stand-in for BaseInviteUser that records what InviteUser hands it, so this file tests only
// InviteUser's own job: building the default data source for USER_SELECT fields.
vi.mock('../../components/presentation/invite-user/BaseInviteUser', async () => {
  const {defineComponent: define, h: render} = await import('vue');
  return {
    default: define({
      name: 'BaseInviteUser',
      props: {fetchUsers: {default: undefined, type: Function}},
      setup(props: {fetchUsers?: FetchUsers}) {
        mocks.baseProps = props;
        return () => render('div');
      },
    }),
  };
});
vi.mock('../../api/getUsers', () => ({default: mocks.getUsers}));
vi.mock('../../composables/useThunderID', () => ({default: () => mocks.thunderID}));

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

const request = (overrides: Record<string, unknown> = {}) => ({
  component: {id: 'owner_input', type: 'USER_SELECT'} as never,
  limit: 30,
  offset: 30,
  signal: new AbortController().signal,
  ...overrides,
});

describe('InviteUser USER_SELECT data source (vue)', () => {
  beforeEach(() => {
    mocks.baseProps = {};
    mocks.thunderID.endpoints = undefined;
    mocks.getUsers.mockReset().mockResolvedValue(usersResponse);
  });

  it('hands BaseInviteUser a data source for USER_SELECT fields', () => {
    mount(InviteUser);

    expect(mocks.baseProps.fetchUsers).toBeTypeOf('function');
  });

  it('pages the user directory from the base URL and turns the response into a picker page', async () => {
    mount(InviteUser);
    const req = request();

    const page = await mocks.baseProps.fetchUsers!(req);

    expect(mocks.getUsers).toHaveBeenCalledWith({
      baseUrl: 'https://thunder.example',
      filter: undefined,
      limit: 30,
      offset: 30,
      signal: req.signal,
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
    mount(InviteUser);

    await mocks.baseProps.fetchUsers!(request({offset: 0}));

    expect(mocks.getUsers).toHaveBeenCalledWith(expect.objectContaining({url: 'https://resources.example/users'}));
  });

  it('keeps one data source for the component lifetime so an open picker keeps its list', async () => {
    const wrapper = mount(InviteUser);
    const first = mocks.baseProps.fetchUsers;

    await wrapper.setProps({className: 'changed'});

    expect(mocks.baseProps.fetchUsers).toBe(first);
  });
});
