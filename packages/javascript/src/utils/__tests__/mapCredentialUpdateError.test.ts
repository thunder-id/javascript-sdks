// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import StepUpRequiredError from '../../errors/StepUpRequiredError';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import ThunderIDError from '../../errors/ThunderIDError';
import ThunderIDRuntimeError from '../../errors/ThunderIDRuntimeError';
import mapCredentialUpdateError from '../mapCredentialUpdateError';
import {REAUTHENTICATION_FAILED} from '../runWithStepUp';

const apiError = (statusCode: number, message = 'Server said no'): ThunderIDAPIError =>
  new ThunderIDAPIError(message, 'test-code', 'test-origin', statusCode);

const serverError = (statusCode: number, code: string, header?: string): ThunderIDAPIError =>
  new ThunderIDAPIError(
    JSON.stringify({code, message: {defaultValue: `Server text for ${code}`}}),
    'test-code',
    'test-origin',
    statusCode,
    undefined,
    undefined,
    header,
  );

describe('mapCredentialUpdateError', (): void => {
  it('should blame the new password on 400 and surface the server message', (): void => {
    const result = mapCredentialUpdateError(apiError(400, 'Password is too common'));

    expect(result.field).toBe('newPassword');
    expect(result.message).toContain('Password is too common');
  });

  it('should put a missing current value on the current field with translated text', (): void => {
    expect(mapCredentialUpdateError(serverError(400, 'USR-1047'))).toEqual({
      field: 'currentPassword',
      messageKey: 'user.change_password.current.required.error',
    });
  });

  it('should put a wrong current value on the current field with translated text', (): void => {
    expect(mapCredentialUpdateError(serverError(403, 'USR-1048'))).toEqual({
      field: 'currentPassword',
      messageKey: 'user.change_password.current.invalid.error',
    });
  });

  it('should report a needed recent sign-in at form level with its challenge', (): void => {
    const result = mapCredentialUpdateError(
      serverError(401, 'AUTH-4011', 'Bearer error="insufficient_user_authentication", max_age="300"'),
    );

    expect(result).toEqual({
      authenticationChallenge: {error: 'insufficient_user_authentication', maxAge: 300},
      field: null,
      messageKey: 'user.change_password.reauthentication.error',
    });
  });

  it.each([
    ['BROWSER-REAUTHENTICATION-PB01', 'user.reauthentication.popup_blocked.error'],
    ['JS-AUTH_CORE-CRA-IV03', 'user.reauthentication.different_user.error'],
    ['BROWSER-REAUTHENTICATION-DU01', 'user.reauthentication.different_user.error'],
    ['BROWSER-REAUTHENTICATION-PC01', 'user.reauthentication.failed.error'],
  ])('should report a failed re-sign-in (%s) at form level', (code: string, messageKey: string): void => {
    const cause = new ThunderIDRuntimeError('failed', code, 'browser');

    expect(
      mapCredentialUpdateError(new ThunderIDRuntimeError('x', REAUTHENTICATION_FAILED, 'javascript', {cause})),
    ).toEqual({field: null, messageKey});
  });

  it('should report another 403 at form level with the server message', (): void => {
    const result = mapCredentialUpdateError(apiError(403, 'Not allowed'));

    expect(result.field).toBeNull();
    expect(result.message).toContain('Not allowed');
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

  it('should treat a step-up error whose body is not a server error as a step-up', (): void => {
    const error = new StepUpRequiredError(
      'Unauthorized',
      'updateMeCredentials-StepUpRequired-001',
      'javascript',
      401,
      'Unauthorized',
      undefined,
      'Bearer error="insufficient_user_authentication", max_age="60"',
    );

    expect(mapCredentialUpdateError(error)).toMatchObject({
      field: null,
      messageKey: 'user.change_password.reauthentication.error',
    });
  });
});
