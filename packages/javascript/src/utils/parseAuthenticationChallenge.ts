// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AuthenticationChallenge, ServerError} from '../models/api';

/**
 * The error `error` value of a challenge that asks for a more recent sign-in (RFC 9470).
 */
export const INSUFFICIENT_USER_AUTHENTICATION = 'insufficient_user_authentication';

/**
 * The server code that comes with a request for a more recent sign-in.
 */
export const RECENT_AUTHENTICATION_REQUIRED_CODE = 'AUTH-4011';

const toMaxAge = (value: string | undefined): number | undefined => {
  if (value === undefined || !/^\d+$/.test(value.trim())) {
    return undefined;
  }

  return Number(value.trim());
};

/**
 * Reads the `Bearer` challenge from a `WWW-Authenticate` header value.
 */
const parseHeader = (header: string): AuthenticationChallenge | undefined => {
  const bearer: RegExpExecArray | null = /(?:^|,)\s*Bearer\s+(.*)$/i.exec(header);

  if (!bearer) {
    return undefined;
  }

  const params: Record<string, string> = {};
  const pattern = /([A-Za-z0-9_-]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,"]+))/g;
  let match: RegExpExecArray | null = pattern.exec(bearer[1]);

  while (match !== null) {
    const key: string = match[1].toLowerCase();

    if (!(key in params)) {
      params[key] = match[2] !== undefined ? match[2].replace(/\\(.)/g, '$1') : match[3];
    }

    match = pattern.exec(bearer[1]);
  }

  if (!params['error']) {
    return undefined;
  }

  return {
    error: params['error'],
    ...(params['error_description'] !== undefined && {errorDescription: params['error_description']}),
    ...(toMaxAge(params['max_age']) !== undefined && {maxAge: toMaxAge(params['max_age'])}),
  };
};

/**
 * Reads the challenge of a `401` that asks for a more recent sign-in (RFC 9470).
 *
 * The `WWW-Authenticate` header is read first. When it is missing, for example because a browser
 * does not expose it, a body with the code `AUTH-4011` gives the challenge and its `maxAge` parameter.
 *
 * @param wwwAuthenticate - The response's `WWW-Authenticate` header value, if any.
 * @param serverError - The response's error body, if any.
 * @returns The challenge, or `undefined` when the response carries none.
 * @example
 * ```typescript
 * const challenge = parseAuthenticationChallenge(response.headers.get('www-authenticate'));
 * if (challenge?.error === 'insufficient_user_authentication') {
 *   await signIn({max_age: String(challenge.maxAge ?? 0)});
 * }
 * ```
 */
const parseAuthenticationChallenge = (
  wwwAuthenticate?: string | null,
  serverError?: ServerError,
): AuthenticationChallenge | undefined => {
  const fromHeader: AuthenticationChallenge | undefined = wwwAuthenticate ? parseHeader(wwwAuthenticate) : undefined;

  if (fromHeader) {
    if (fromHeader.maxAge === undefined && serverError?.code === RECENT_AUTHENTICATION_REQUIRED_CODE) {
      const maxAge: number | undefined = toMaxAge(serverError.description?.params?.['maxAge']);

      return maxAge === undefined ? fromHeader : {...fromHeader, maxAge};
    }

    return fromHeader;
  }

  if (serverError?.code === RECENT_AUTHENTICATION_REQUIRED_CODE) {
    const maxAge: number | undefined = toMaxAge(serverError.description?.params?.['maxAge']);

    return {error: INSUFFICIENT_USER_AUTHENTICATION, ...(maxAge !== undefined && {maxAge})};
  }

  return undefined;
};

export default parseAuthenticationChallenge;
