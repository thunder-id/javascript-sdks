// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {cookies} from 'next/headers';
import {deleteChunkedCookie, toCookieDeletion} from '../../utils/chunkedCookie';
import logger from '../../utils/logger';
import SessionManager from '../../utils/SessionManager';

type RequestCookies = Awaited<ReturnType<typeof cookies>>;

/**
 * Deletes all ThunderID session cookies from the browser without contacting the
 * identity server.
 *
 * Use this for error-recovery scenarios where the local session must be wiped
 * immediately: refresh token failures, corrupt sessions, or forced local sign-out
 * when the identity server is unreachable.
 *
 * For a complete sign-out that also revokes the server-side session and obtains the
 * after-sign-out redirect URL, use `signOutAction` instead.
 *
 * @example
 * ```typescript
 * import { clearSession } from '@thunderid/nextjs/server';
 *
 * // Inside a Server Action or Route Handler:
 * await clearSession();
 * redirect('/sign-in');
 * ```
 */
const clearSession = async (): Promise<void> => {
  const cookieStore: RequestCookies = await cookies();
  deleteChunkedCookie(cookieStore, SessionManager.getSessionCookieName(), SessionManager.getSessionCookieOptions(0));
  cookieStore.delete(
    toCookieDeletion(SessionManager.getTempSessionCookieName(), SessionManager.getTempSessionCookieOptions()),
  );
  logger.debug('[clearSession] Session cookies cleared.');
};

export default clearSession;
