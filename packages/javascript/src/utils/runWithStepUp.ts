// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {INSUFFICIENT_USER_AUTHENTICATION} from './parseAuthenticationChallenge';
import StepUpRequiredError from '../errors/StepUpRequiredError';
import ThunderIDRuntimeError from '../errors/ThunderIDRuntimeError';
import {AuthenticationChallenge} from '../models/api';
import {ReauthenticationOptions} from '../models/reauthentication';

/**
 * The code of the error {@link runWithStepUp} throws when signing in again failed. Its `details.cause` is
 * the error `reauthenticate` threw; map it with `mapReauthenticationError`.
 */
export const REAUTHENTICATION_FAILED = 'JS-STEP_UP-RF01';

/**
 * The code of the error {@link runWithStepUp} throws when the caller stopped being active, for example a
 * form that closed, while the user signed in again. The change is then not sent.
 */
export const STEP_UP_ABANDONED = 'JS-STEP_UP-AB01';

/**
 * Holds a challenge the user has not answered yet, for example because the browser blocked the popup,
 * so the next attempt signs in again first, inside the user action.
 */
export interface PendingStepUp {
  current?: AuthenticationChallenge;
}

export interface RunWithStepUpOptions<R> {
  /**
   * Checked after signing in again, before the change is sent once more. When it returns `false`, for
   * example because the form that holds the change has closed, the change is not sent.
   */
  isActive?: () => boolean;
  /**
   * Called instead of signing in again, when the application handles the challenge itself. The
   * `StepUpRequiredError` is then rethrown.
   */
  onReauthenticationRequired?: (challenge: AuthenticationChallenge) => void;
  /**
   * The challenge left from an earlier attempt, if any.
   */
  pending?: PendingStepUp;
  /**
   * Signs the user in again, replacing the session's tokens.
   */
  reauthenticate: (options: ReauthenticationOptions) => Promise<void>;
  /**
   * Sends the change. Called at most twice: once, and once more after signing in again.
   */
  send: () => Promise<R>;
}

/**
 * Sends a self-service change and, when the server asks for a more recent sign-in, signs the user in
 * again with the challenge's `maxAge` and sends the change once more. The change stays in the caller's
 * memory only. It never refreshes the token, since a refreshed token keeps the original sign-in time.
 *
 * - A second refusal, step-up included, is thrown as it is.
 * - A failed re-sign-in throws a `ThunderIDRuntimeError` with the code {@link REAUTHENTICATION_FAILED},
 *   and keeps the challenge in `pending`, so the next call signs in again before sending.
 *
 * @param options - The change, the re-sign-in, and the pending challenge.
 * @returns What `send` returned.
 * @example
 * ```typescript
 * await runWithStepUp({
 *   pending,
 *   reauthenticate: (options) => client.reauthenticate(options),
 *   send: () => updateMeProfile({baseUrl, payload, fetcher}),
 * });
 * ```
 */
const runWithStepUp = async <R>({
  isActive,
  onReauthenticationRequired,
  pending,
  reauthenticate,
  send,
}: RunWithStepUpOptions<R>): Promise<R> => {
  const signInAgain = async (challenge: AuthenticationChallenge): Promise<void> => {
    try {
      await reauthenticate({maxAge: challenge.maxAge});
    } catch (cause: unknown) {
      if (pending) {
        pending.current = challenge;
      }

      const details: {cause: unknown} = {cause};

      throw new ThunderIDRuntimeError(
        'Signing in again did not complete.',
        REAUTHENTICATION_FAILED,
        'javascript',
        details,
      );
    }
  };

  const sendAgain = (): Promise<R> => {
    if (isActive && !isActive()) {
      throw new ThunderIDRuntimeError(
        'The change was not sent: it was left before signing in again completed.',
        STEP_UP_ABANDONED,
        'javascript',
      );
    }

    return send();
  };

  const left: AuthenticationChallenge | undefined = pending?.current;

  if (left && !onReauthenticationRequired) {
    pending!.current = undefined;
    await signInAgain(left);

    return sendAgain();
  }

  try {
    return await send();
  } catch (error) {
    if (!(error instanceof StepUpRequiredError)) {
      throw error;
    }

    const challenge: AuthenticationChallenge = error.authenticationChallenge ?? {
      error: INSUFFICIENT_USER_AUTHENTICATION,
    };

    if (onReauthenticationRequired) {
      onReauthenticationRequired(challenge);
      throw error;
    }

    await signInAgain(challenge);

    return sendAgain();
  }
};

export default runWithStepUp;
