// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import ThunderIDError from './ThunderIDError';
import {AuthenticationChallenge, ServerError} from '../models/api';
import parseAuthenticationChallenge from '../utils/parseAuthenticationChallenge';
import parseApiErrorMessage from '../utils/parseApiErrorMessage';

/**
 * Reads the server's error envelope from a raw response body, when the body is one.
 */
const parseServerError = (body: string): ServerError | undefined => {
  try {
    const parsed: unknown = JSON.parse(body);

    if (parsed && typeof parsed === 'object' && typeof (parsed as ServerError).code === 'string') {
      return parsed as ServerError;
    }
  } catch {
    // Not JSON: there is no envelope to read.
  }

  return undefined;
};

/**
 * Base class for all API-related errors in ThunderID. This class extends ThunderIDError
 * and adds support for HTTP status codes and status text.
 *
 * The `message` parameter may be either a plain string or a raw JSON error body from the
 * ThunderID API — the constructor will extract a human-readable message automatically.
 * An optional `prefix` is prepended to the resolved message (e.g. "Failed to fetch user profile").
 *
 * @example
 * ```typescript
 * throw new ThunderIDAPIError(
 *   "Failed to fetch user data",
 *   "API_FETCH_ERROR",
 *   "javascript",
 *   404,
 *   "Not Found"
 * );
 * ```
 */
export default class ThunderIDAPIError extends ThunderIDError {
  /**
   * The error the server returned, when its response body was an error envelope: the server's own
   * error code, and its message and description with their translation keys and parameters. Use it to
   * show a message specific to the server's code.
   */
  public readonly serverError?: ServerError;

  /**
   * The challenge of a `401` that asks for a more recent sign-in (RFC 9470), from the
   * `WWW-Authenticate` header or, when the header is not readable, from an `AUTH-4011` body. Sign the
   * user in again with its `maxAge` and retry.
   */
  public readonly authenticationChallenge?: AuthenticationChallenge;

  /**
   * Creates an instance of ThunderIDAPIError.
   *
   * @param message - Human-readable description or raw API error response body
   * @param code - A unique error code that identifies the error type
   * @param origin - The SDK origin (e.g. 'react', 'vue')
   * @param statusCode - HTTP status code of the failed request
   * @param statusText - HTTP status text of the failed request
   * @param prefix - Optional prefix prepended to the resolved message
   * @param wwwAuthenticate - The response's `WWW-Authenticate` header value, read into `authenticationChallenge`
   * @constructor
   */
  constructor(
    message: string,
    code: string,
    origin: string,
    public readonly statusCode?: number,
    public readonly statusText?: string,
    prefix?: string,
    wwwAuthenticate?: string | null,
  ) {
    const parsed: string = parseApiErrorMessage(message);
    const resolvedMessage: string = prefix ? `${prefix}: ${parsed}` : parsed;
    super(resolvedMessage, code, origin);

    this.serverError = parseServerError(message);
    this.authenticationChallenge =
      statusCode === 401 ? parseAuthenticationChallenge(wwwAuthenticate, this.serverError) : undefined;

    Object.defineProperty(this, 'name', {
      configurable: true,
      value: 'ThunderIDAPIError',
      writable: true,
    });
  }

  /**
   * Returns a string representation of the API error
   * @returns Formatted error string with name, code, status, and message
   */
  public override toString(): string {
    const status: string = this.statusCode ? ` (HTTP ${this.statusCode} - ${this.statusText})` : '';
    return `[${this.name}] (code="${this.code}")${status}\nMessage: ${this.message}`;
  }
}
