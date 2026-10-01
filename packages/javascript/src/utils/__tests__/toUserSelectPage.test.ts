// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import type {ManagedUser, ManagedUserListResponse} from '../../models/managed-user';
import toUserSelectPage from '../toUserSelectPage';

const managedUser = (user: Partial<ManagedUser> & {id: string}): ManagedUser => ({
  ouId: 'ou-1',
  type: 'person',
  ...user,
});

const response = (users: ManagedUser[], startIndex: number, totalResults: number): ManagedUserListResponse => ({
  count: users.length,
  links: [],
  startIndex,
  totalResults,
  users,
});

describe('toUserSelectPage', () => {
  it('maps the users and computes the next offset from the request offset and count', () => {
    const users: ManagedUser[] = [
      managedUser({display: 'Alice', id: 'user-1'}),
      managedUser({display: 'Bob', id: 'user-2'}),
    ];

    expect(toUserSelectPage(response(users, 31, 75), 30)).toEqual({
      nextOffset: 32,
      options: [
        {label: 'Alice', value: 'user-1'},
        {label: 'Bob', value: 'user-2'},
      ],
      totalResults: 75,
    });
  });

  it('ends the list on the last page', () => {
    expect(toUserSelectPage(response([managedUser({id: 'user-75'})], 75, 75), 74).nextOffset).toBeNull();
  });

  it('advances by the backend count even when the mapping drops users', () => {
    const users: ManagedUser[] = [
      managedUser({attributes: {email: 'a@example.com'}, id: 'user-1'}),
      managedUser({id: 'user-2'}),
    ];
    const page = toUserSelectPage(response(users, 1, 10), 0, {valueAttribute: 'email'});

    expect(page.options).toEqual([{label: 'a@example.com', value: 'a@example.com'}]);
    expect(page.nextOffset).toBe(2);
  });
});
