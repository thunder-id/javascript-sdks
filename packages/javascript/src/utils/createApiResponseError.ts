// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import StepUpRequiredError, {INSUFFICIENT_USER_AUTHENTICATION} from '../errors/StepUpRequiredError';
import ThunderIDAPIError from '../errors/ThunderIDAPIError';

/**
 * Builds the error for a failed self-service response. A `401` that asks for a more recent sign-in
 * becomes a {@link StepUpRequiredError} with the code `<operation>-StepUpRequired-001`; anything else is
 * a {@link ThunderIDAPIError} with the code `<operation>-ResponseError-001`.
 *
 * @param operation - The operation name used in the error code, such as `updateMeProfile`.
 * @param errorText - The response body.
 * @param response - The response.
 * @param prefix - The prefix of the error message.
 * @returns The error to throw.
 */
const createApiResponseError = (
  operation: string,
  errorText: string,
  response: Response,
  prefix: string,
): ThunderIDAPIError => {
  const wwwAuthenticate: string | null | undefined = response.headers?.get?.('www-authenticate');
  const error: ThunderIDAPIError = new ThunderIDAPIError(
    errorText,
    `${operation}-ResponseError-001`,
    'javascript',
    response.status,
    response.statusText,
    prefix,
    wwwAuthenticate,
  );

  if (error.authenticationChallenge?.error !== INSUFFICIENT_USER_AUTHENTICATION) {
    return error;
  }

  return new StepUpRequiredError(
    errorText,
    `${operation}-StepUpRequired-001`,
    'javascript',
    response.status,
    response.statusText,
    prefix,
    wwwAuthenticate,
  );
};

export default createApiResponseError;
