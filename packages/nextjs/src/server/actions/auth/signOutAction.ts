// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {cookies} from 'next/headers';
import {deleteChunkedCookie, getChunkedCookie, toCookieDeletion} from '../../../utils/chunkedCookie';
import logger from '../../../utils/logger';
import SessionManager from '../../../utils/SessionManager';
import getClient from '../../getClient';

type RequestCookies = Awaited<ReturnType<typeof cookies>>;

/**
 * Reads the session ID for sign-out. An expired access token still identifies the session, so sign-out
 * ends the authorization server's session too. The cookie must still decrypt, and a session a
 * back-channel logout ended is still refused.
 */
const getSessionIdForSignOut = async (): Promise<string | undefined> => {
  const token: string | undefined = getChunkedCookie(await cookies(), SessionManager.getSessionCookieName());

  if (!token) {
    return undefined;
  }

  try {
    return (await SessionManager.verifySessionTokenForRefresh(token)).sessionId;
  } catch {
    return undefined;
  }
};

/**
 * Server action for signing out a user.
 * Clears both JWT and legacy session cookies.
 *
 * @returns Promise that resolves with success status and the URL to send the browser to: the server's end-session
 * URL, which ends the single sign-on session and returns to the after sign-out URL, or the after sign-out URL itself
 * when there is no server session to end
 */
const signOutAction = async (): Promise<{data?: {signOutUrl?: string}; error?: unknown; success: boolean}> => {
  logger.debug('[signOutAction] Initiating sign out process from the server action.');

  const clearSessionCookies = async (): Promise<void> => {
    const cookieStore: RequestCookies = await cookies();

    deleteChunkedCookie(cookieStore, SessionManager.getSessionCookieName(), SessionManager.getSessionCookieOptions(0));
    cookieStore.delete(
      toCookieDeletion(SessionManager.getTempSessionCookieName(), SessionManager.getTempSessionCookieOptions()),
    );
  };

  try {
    const client = getClient();
    const sessionId: string | undefined = await getSessionIdForSignOut();

    let signOutUrl = '/';

    if (sessionId) {
      logger.debug('[signOutAction] Session ID found, invoking the `signOut` to obtain the sign-out URL.');

      signOutUrl = await client.signOut({}, sessionId);
    }

    await clearSessionCookies();

    return {data: {signOutUrl}, success: true};
  } catch (error) {
    logger.error('[signOutAction] Error during sign out from the server action:', error);

    logger.debug('[signOutAction] Clearing session cookies due to error as a fallback.');

    await clearSessionCookies();

    let errorMessage: unknown;
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = JSON.stringify(error);
    }

    return {
      error: errorMessage,
      success: false,
    };
  }
};

export default signOutAction;
