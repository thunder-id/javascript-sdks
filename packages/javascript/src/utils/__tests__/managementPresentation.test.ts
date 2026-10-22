// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import resolveManagedIdentityName from '../resolveManagedIdentityName';
import toManagementErrorMessage from '../toManagementErrorMessage';

const t = (key: string): string => `t:${key}`;

const apiError = (statusCode: number): ThunderIDAPIError =>
  new ThunderIDAPIError('Server text that must not be shown', 'test-code', 'javascript', statusCode);

describe('toManagementErrorMessage', () => {
  it('returns null when there is no error', () => {
    expect(toManagementErrorMessage(t, null, 'admin.users.list.error')).toBeNull();
  });

  it('names a missing permission and a missing resource on their own', () => {
    expect(toManagementErrorMessage(t, apiError(403), 'admin.users.list.error')).toBe(
      't:admin.common.errors.forbidden',
    );
    expect(toManagementErrorMessage(t, apiError(404), 'admin.users.list.error')).toBe(
      't:admin.common.errors.not_found',
    );
  });

  it('falls back to the operation message and never the server text', () => {
    expect(toManagementErrorMessage(t, apiError(500), 'admin.users.list.error')).toBe('t:admin.users.list.error');
    expect(toManagementErrorMessage(t, new Error('boom'), 'admin.users.list.error')).toBe('t:admin.users.list.error');
  });
});

describe('resolveManagedIdentityName', () => {
  it('prefers the server display value, then name attributes, then the identifier', () => {
    expect(resolveManagedIdentityName({display: 'Aiko Tanaka', id: 'u-1'})).toBe('Aiko Tanaka');
    expect(resolveManagedIdentityName({id: 'a-1', name: 'Deploy bot'})).toBe('Deploy bot');
    expect(resolveManagedIdentityName({attributes: {family_name: 'Rivera', given_name: 'Sam'}, id: 'u-2'})).toBe(
      'Sam Rivera',
    );
    expect(resolveManagedIdentityName({attributes: {username: 'priya'}, id: 'u-3'})).toBe('priya');
    expect(resolveManagedIdentityName({id: 'u-4'})).toBe('u-4');
  });
});
