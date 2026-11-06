// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {ManagedUser} from '../../models/managed-user';
import isAdminVerifiableAttribute from '../isAdminVerifiableAttribute';

const user = (overrides: Partial<ManagedUser> = {}): ManagedUser => ({
  attributes: {email: 'jane@example.com', given_name: 'Jane', mobile: '+94770000001'},
  id: 'u-1',
  ouId: 'ou-1',
  type: 'Person',
  verifiedAttributes: {},
  ...overrides,
});

describe('isAdminVerifiableAttribute', () => {
  it('accepts the email of a user whose verification the server reports, verified or not', () => {
    expect(isAdminVerifiableAttribute(user(), 'email')).toBe(true);
    expect(
      isAdminVerifiableAttribute(user({verifiedAttributes: {email: {verifiedAt: '2026-11-03T00:00:00Z'}}}), 'email'),
    ).toBe(true);
  });

  it.each(['mobile', 'given_name', 'unknown'])('refuses %s, which the administrator flow does not send to', (name) => {
    expect(isAdminVerifiableAttribute(user(), name)).toBe(false);
  });

  it.each<[string, Partial<ManagedUser>]>([
    ['no verification reported', {verifiedAttributes: undefined}],
    ['a null verification field', {verifiedAttributes: null as unknown as ManagedUser['verifiedAttributes']}],
    ['a malformed verification field', {verifiedAttributes: [] as unknown as ManagedUser['verifiedAttributes']}],
    ['no email', {attributes: {given_name: 'Jane'}}],
    ['a blank email', {attributes: {email: ' '}}],
    ['a non-text email', {attributes: {email: ['a@example.com']}}],
  ])('refuses a user with %s', (_label, overrides) => {
    expect(isAdminVerifiableAttribute(user(overrides), 'email')).toBe(false);
  });

  it('refuses when there is no user', () => {
    expect(isAdminVerifiableAttribute(undefined, 'email')).toBe(false);
  });
});
