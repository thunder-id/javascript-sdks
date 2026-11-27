// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/** The environment variable that sets the session cookie's `SameSite` where the SDK configuration cannot reach. */
export const SESSION_COOKIE_SAME_SITE_ENV = 'THUNDERID_SESSION_COOKIE_SAME_SITE';

export type SessionCookieSameSite = 'lax' | 'strict' | 'none';

const VALUES: readonly SessionCookieSameSite[] = ['lax', 'strict', 'none'];

let warned = false;

/**
 * Resolves the `SameSite` attribute of the session cookie.
 *
 * The first one set wins: `configured`, then `THUNDERID_SESSION_COOKIE_SAME_SITE`, then `strict`, which RFC 10017
 * §6.1.3.2 recommends for a BFF. Anything else logs a warning once, since the browser then sends the session cookie
 * on requests that another site starts, and only the BFF's request checks stand against cross-site request forgery.
 *
 * The cookie that carries a sign-in in progress is always `lax`, whatever this returns, so that it comes back on
 * ThunderID's redirect to the callback.
 *
 * @param configured - The value from the SDK configuration.
 * @returns The `SameSite` value for the session cookie.
 */
const resolveSessionCookieSameSite = (configured?: SessionCookieSameSite): SessionCookieSameSite => {
  const fromEnv: string | undefined =
    typeof process !== 'undefined' ? process.env[SESSION_COOKIE_SAME_SITE_ENV]?.toLowerCase() : undefined;
  const sameSite: SessionCookieSameSite =
    configured ?? VALUES.find((value: SessionCookieSameSite) => value === fromEnv) ?? 'strict';

  if (sameSite !== 'strict' && !warned) {
    warned = true;
    // eslint-disable-next-line no-console
    console.warn(
      `The session cookie is SameSite=${sameSite}. RFC 10017 recommends SameSite=Strict for a BFF; ` +
        'use it unless the app must keep the session on links from other sites.',
    );
  }

  return sameSite;
};

export default resolveSessionCookieSameSite;
