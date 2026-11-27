// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDAPIError from './ThunderIDAPIError';

export {INSUFFICIENT_USER_AUTHENTICATION} from '../utils/parseAuthenticationChallenge';

/**
 * Thrown when a change needs a more recent sign-in, such as setting a credential the user does not hold
 * yet or changing an email address. Sign the user in again with `maxAge` as `max_age` (for example with
 * `reauthenticate`) and retry the change once. Refreshing the access token does not help: a refreshed
 * token keeps the original sign-in time.
 *
 * @example
 * ```typescript
 * try {
 *   await updateMeProfile({baseUrl, payload, fetcher});
 * } catch (error) {
 *   if (error instanceof StepUpRequiredError) {
 *     await client.reauthenticate({maxAge: error.maxAge});
 *     await updateMeProfile({baseUrl, payload, fetcher});
 *   }
 * }
 * ```
 */
export default class StepUpRequiredError extends ThunderIDAPIError {
  /**
   * How recent, in seconds, the sign-in must be, when the server said.
   */
  public readonly maxAge?: number;

  constructor(
    message: string,
    code: string,
    origin: string,
    statusCode?: number,
    statusText?: string,
    prefix?: string,
    wwwAuthenticate?: string | null,
  ) {
    super(message, code, origin, statusCode, statusText, prefix, wwwAuthenticate);

    this.maxAge = this.authenticationChallenge?.maxAge;

    Object.defineProperty(this, 'name', {
      configurable: true,
      value: 'StepUpRequiredError',
      writable: true,
    });
  }
}
