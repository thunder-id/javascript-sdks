// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The authorization parameters that ask for a recent sign-in.
 */
export interface RecentSignInParams {
  max_age?: string;
  prompt?: 'login';
}

/**
 * Picks, from sign-in options or a sign-in route's query, the authorization parameters that ask for a
 * recent sign-in: `max_age` as a whole number of seconds, zero or more, and `prompt` when it is `login`.
 * Everything else is dropped, so a route can pass them on to the authorization request.
 *
 * @param options - The sign-in options or query.
 * @returns The parameters to add to the authorization request.
 * @example
 * ```typescript
 * pickRecentSignInParams({max_age: '180', returnTo: '/account'}); // {max_age: '180'}
 * ```
 */
const pickRecentSignInParams = (options?: Record<string, unknown> | null): RecentSignInParams => {
  const params: RecentSignInParams = {};
  const maxAge: unknown = options?.['max_age'];
  const text: string = typeof maxAge === 'number' ? String(maxAge) : typeof maxAge === 'string' ? maxAge.trim() : '';

  if (/^\d+$/.test(text)) {
    params.max_age = String(Number(text));
  }

  if (options?.['prompt'] === 'login') {
    params.prompt = 'login';
  }

  return params;
};

export default pickRecentSignInParams;
