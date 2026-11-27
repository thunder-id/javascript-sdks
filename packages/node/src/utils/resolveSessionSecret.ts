// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDRuntimeError} from '@thunderid/javascript';
import SessionCookie from './SessionCookie';

/** The environment variable the BFF contract reads the session secret from. */
export const SESSION_SECRET_ENV = 'THUNDERID_SESSION_SECRET';

// Only for development, so an app runs before it is configured. It is refused in production.
const DEVELOPMENT_SECRET = 'development-session-secret-do-not-use-in-production';

const warned: Set<string> = new Set<string>();

const warnOnce = (message: string): void => {
  if (!warned.has(message)) {
    warned.add(message);
    // eslint-disable-next-line no-console
    console.warn(message);
  }
};

/**
 * Resolves the secret the session cookie is encrypted with.
 *
 * The first one set wins: `configured`, then `THUNDERID_SESSION_SECRET`, then each of `deprecatedEnv` with a
 * warning to move to `THUNDERID_SESSION_SECRET`. A missing secret, one shorter than 32 bytes, or the published
 * development secret throws, unless `NODE_ENV` is `development` or `test`. There, a fixed development secret is used
 * instead, with a warning. An unset or other `NODE_ENV`, such as `staging`, counts as a deployment.
 *
 * @param options - `configured` is the secret from the SDK configuration. `deprecatedEnv` lists older
 *   environment variable names still read. `sdk` names the SDK in errors.
 * @returns The secret.
 */
const resolveSessionSecret = (options: {configured?: string; deprecatedEnv?: string[]; sdk?: string} = {}): string => {
  const env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {};
  // Only an explicit development or test run may fall back to the published secret.
  const developing: boolean = env['NODE_ENV'] === 'development' || env['NODE_ENV'] === 'test';
  // An empty value counts as not set, so `??` would not do here.
  let secret: string | undefined = [options.configured, env[SESSION_SECRET_ENV]].find((value?: string) => !!value);

  if (!secret) {
    const legacyName: string | undefined = options.deprecatedEnv?.find((name: string) => env[name]);

    if (legacyName) {
      warnOnce(`[${options.sdk ?? 'node'}] ${legacyName} is deprecated. Rename it to ${SESSION_SECRET_ENV}.`);
      secret = env[legacyName];
    }
  }

  const isDevelopmentSecret: boolean = secret === DEVELOPMENT_SECRET;

  if (SessionCookie.isUsableSecret(secret) && !(isDevelopmentSecret && !developing)) {
    return secret;
  }

  let problem = `${SESSION_SECRET_ENV} is not set`;

  if (isDevelopmentSecret) {
    problem = `${SESSION_SECRET_ENV} is the published development secret`;
  } else if (secret) {
    problem = `${SESSION_SECRET_ENV} is shorter than ${SessionCookie.MIN_SECRET_LENGTH} bytes`;
  }

  if (!developing) {
    throw new ThunderIDRuntimeError(
      `${problem}. The session cookie cannot be encrypted.`,
      'session-secret-required',
      options.sdk ?? 'node',
      `Set ${SESSION_SECRET_ENV} to a random value of at least ${SessionCookie.MIN_SECRET_LENGTH} bytes, ` +
        'for example the output of `openssl rand -base64 32`.',
    );
  }

  warnOnce(
    `[${options.sdk ?? 'node'}] ${problem}. Using a development secret, which is refused outside development and test.`,
  );

  return DEVELOPMENT_SECRET;
};

export default resolveSessionSecret;
