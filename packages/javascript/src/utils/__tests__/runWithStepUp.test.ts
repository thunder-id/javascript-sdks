// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi} from 'vitest';
import StepUpRequiredError from '../../errors/StepUpRequiredError';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import runWithStepUp, {PendingStepUp, REAUTHENTICATION_FAILED, STEP_UP_ABANDONED} from '../runWithStepUp';

const stepUp = (): StepUpRequiredError =>
  new StepUpRequiredError(
    JSON.stringify({code: 'AUTH-4011', message: {defaultValue: 'Recent authentication required'}}),
    'updateMeProfile-StepUpRequired-001',
    'javascript',
    401,
    'Unauthorized',
    undefined,
    'Bearer error="insufficient_user_authentication", max_age="300"',
  );

describe('runWithStepUp', () => {
  it('sends once and does not sign in again when the change succeeds', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const reauthenticate = vi.fn();

    await expect(runWithStepUp({reauthenticate, send})).resolves.toBe('ok');
    expect(send).toHaveBeenCalledTimes(1);
    expect(reauthenticate).not.toHaveBeenCalled();
  });

  it('signs in again with the challenge maxAge and retries exactly once', async () => {
    const send = vi.fn().mockRejectedValueOnce(stepUp()).mockResolvedValueOnce('ok');
    const reauthenticate = vi.fn().mockResolvedValue(undefined);

    await expect(runWithStepUp({reauthenticate, send})).resolves.toBe('ok');
    expect(reauthenticate).toHaveBeenCalledWith({maxAge: 300});
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('throws a second refusal without trying again', async () => {
    const send = vi.fn().mockRejectedValue(stepUp());
    const reauthenticate = vi.fn().mockResolvedValue(undefined);

    await expect(runWithStepUp({reauthenticate, send})).rejects.toBeInstanceOf(StepUpRequiredError);
    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('reports a failed re-sign-in, keeps the challenge, and signs in again first next time', async () => {
    const pending: PendingStepUp = {};
    const cause = Object.assign(new Error('blocked'), {code: 'BROWSER-REAUTHENTICATION-PB01'});
    const send = vi.fn().mockRejectedValueOnce(stepUp()).mockResolvedValueOnce('ok');
    const reauthenticate = vi.fn().mockRejectedValueOnce(cause).mockResolvedValueOnce(undefined);

    await expect(runWithStepUp({pending, reauthenticate, send})).rejects.toMatchObject({
      code: REAUTHENTICATION_FAILED,
      details: {cause},
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(pending.current).toEqual({error: 'insufficient_user_authentication', maxAge: 300});

    await expect(runWithStepUp({pending, reauthenticate, send})).resolves.toBe('ok');
    expect(reauthenticate).toHaveBeenNthCalledWith(2, {maxAge: 300});
    expect(reauthenticate.mock.invocationCallOrder[1]).toBeLessThan(send.mock.invocationCallOrder[1]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(pending.current).toBeUndefined();
  });

  it('hands the challenge to the application instead of signing in again', async () => {
    const send = vi.fn().mockRejectedValue(stepUp());
    const reauthenticate = vi.fn();
    const onReauthenticationRequired = vi.fn();

    await expect(runWithStepUp({onReauthenticationRequired, reauthenticate, send})).rejects.toBeInstanceOf(
      StepUpRequiredError,
    );
    expect(onReauthenticationRequired).toHaveBeenCalledWith({
      error: 'insufficient_user_authentication',
      maxAge: 300,
    });
    expect(reauthenticate).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('passes any other failure through without signing in again', async () => {
    const refused = new ThunderIDAPIError('Forbidden', 'x', 'javascript', 403);
    const send = vi.fn().mockRejectedValue(refused);
    const reauthenticate = vi.fn();

    await expect(runWithStepUp({reauthenticate, send})).rejects.toBe(refused);
    expect(reauthenticate).not.toHaveBeenCalled();
  });

  it('does not send the change again when the caller is no longer active after signing in again', async () => {
    const send = vi.fn().mockRejectedValueOnce(stepUp()).mockResolvedValueOnce('ok');
    let active = true;
    const reauthenticate = vi.fn(() => {
      active = false;

      return Promise.resolve();
    });

    await expect(runWithStepUp({isActive: () => active, reauthenticate, send})).rejects.toMatchObject({
      code: STEP_UP_ABANDONED,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
