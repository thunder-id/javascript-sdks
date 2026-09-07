// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import ThunderIDError from '../../errors/ThunderIDError';
import mapCredentialUpdateError from '../mapCredentialUpdateError';

const apiError = (statusCode: number, message = 'Server said no'): ThunderIDAPIError =>
  new ThunderIDAPIError(message, 'test-code', 'test-origin', statusCode);

describe('mapCredentialUpdateError', (): void => {
  it('should blame the current password on 403', (): void => {
    const result = mapCredentialUpdateError(apiError(403));

    expect(result.field).toBe('currentPassword');
    expect(result.messageKey).toBe('user.change_password.current.invalid.error');
    expect(result.message).toBeUndefined();
  });

  it('should blame the new password on 400 and surface the server message', (): void => {
    const result = mapCredentialUpdateError(apiError(400, 'Password is too common'));

    expect(result.field).toBe('newPassword');
    expect(result.message).toContain('Password is too common');
  });

  it('should report other API errors at form level with the server message', (): void => {
    const result = mapCredentialUpdateError(apiError(500, 'Upstream exploded'));

    expect(result.field).toBeNull();
    expect(result.message).toContain('Upstream exploded');
  });

  it('should report a non-API ThunderIDError at form level', (): void => {
    const result = mapCredentialUpdateError(new ThunderIDError('Network down', 'test-code', 'test-origin'));

    expect(result.field).toBeNull();
    expect(result.message).toContain('Network down');
  });

  it.each([
    [apiError(403)],
    [apiError(400, 'too common')],
    [apiError(500, 'boom')],
    [new ThunderIDError('offline', 'test-code', 'test-origin')],
    [new Error('plain')],
    [undefined],
  ])('should always supply a messageKey so callers need no non-null assertion (%s)', (thrown: unknown): void => {
    expect(typeof mapCredentialUpdateError(thrown).messageKey).toBe('string');
  });

  it.each([[new Error('plain')], ['a string'], [undefined], [null]])(
    'should fall back to the generic key for an unrecognized throw (%s)',
    (thrown: unknown): void => {
      const result = mapCredentialUpdateError(thrown);

      expect(result.field).toBeNull();
      expect(result.messageKey).toBe('user.change_password.generic.error');
      expect(result.message).toBeUndefined();
    },
  );
});
