// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import type {ManagedUser} from '../../models/managed-user';
import toUserSelectOption from '../toUserSelectOption';

const managedUser = (user: Partial<ManagedUser> & {id: string}): ManagedUser => ({
  ouId: 'ou-1',
  type: 'person',
  ...user,
});

describe('toUserSelectOption', () => {
  it('submits the ID and labels the option with the display name', () => {
    const user: ManagedUser = managedUser({display: 'Alice Example', id: 'user-1'});

    expect(toUserSelectOption(user)).toEqual({label: 'Alice Example', value: 'user-1'});
  });

  it('falls back to username, then email, then the ID', () => {
    expect(
      toUserSelectOption(managedUser({attributes: {email: 'a@example.com', username: 'alice'}, id: 'user-1'}))?.label,
    ).toBe('alice');
    expect(toUserSelectOption(managedUser({attributes: {email: 'a@example.com'}, id: 'user-1'}))?.label).toBe(
      'a@example.com',
    );
    expect(toUserSelectOption(managedUser({id: 'user-1'}))?.label).toBe('user-1');
  });

  it('treats a display that merely equals the ID as unset', () => {
    const user: ManagedUser = managedUser({attributes: {username: 'alice'}, display: 'user-1', id: 'user-1'});

    expect(toUserSelectOption(user)?.label).toBe('alice');
  });

  it('honours a configured mapping', () => {
    const user: ManagedUser = managedUser({attributes: {email: 'a@example.com', name: {given: 'Alice'}}, id: 'user-1'});

    expect(toUserSelectOption(user, {labelAttributes: ['name.given'], valueAttribute: 'email'})).toEqual({
      label: 'Alice',
      value: 'a@example.com',
    });
    expect(toUserSelectOption(user, {getLabel: (u) => `${u.id}!`})?.label).toBe('user-1!');
  });

  it('accepts a plain string for both label and value', () => {
    expect(toUserSelectOption('alice@example.com')).toEqual({
      label: 'alice@example.com',
      value: 'alice@example.com',
    });
  });
});
