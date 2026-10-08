// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {IdToken} from '@thunderid/node';
import {cookies} from 'next/headers';
import {ThunderIDNextConfig} from '../../models/config';
import {setChunkedCookie} from '../../utils/chunkedCookie';
import logger from '../../utils/logger';
import SessionManager from '../../utils/SessionManager';
import getClient from '../getClient';

type RequestCookies = Awaited<ReturnType<typeof cookies>>;

/**
 * Server action to handle OAuth callback with authorization code.
 * This action processes the authorization code received from the OAuth provider
 * and exchanges it for tokens to complete the authentication flow.
 *
 * @param code - Authorization code from OAuth provider
 * @param state - State parameter from OAuth provider for CSRF protection
 * @param sessionState - Session state parameter from OAuth provider
 * @returns Promise that resolves with success status and optional error message
 */
const handleOAuthCallbackAction = async (
  code: string,
  state: string,
  sessionState?: string,
): Promise<{
  error?: string;
  redirectUrl?: string;
  success: boolean;
}> => {
  try {
    if (!code || !state) {
      return {
        error: 'Missing required OAuth parameters: code and state are required',
        success: false,
      };
    }

    const thunderIDClient = getClient();

    // A server action can run in a module context that no provider render has initialized, for
    // example after the dev server recompiles, so initialize from the environment first.
    if (!thunderIDClient.isInitialized) {
      await thunderIDClient.initialize({} as ThunderIDNextConfig);
    }

    if (!thunderIDClient.isInitialized) {
      return {
        error: 'ThunderID client is not initialized',
        success: false,
      };
    }

    const cookieStore: RequestCookies = await cookies();
    let sessionId: string | undefined;

    const tempSessionToken: string | undefined = cookieStore.get(SessionManager.getTempSessionCookieName())?.value;

    if (tempSessionToken) {
      try {
        const tempSession: {sessionId: string} = await SessionManager.verifyTempSession(tempSessionToken);
        sessionId = tempSession.sessionId;
      } catch {
        logger.error(
          '[handleOAuthCallbackAction] Invalid temporary session token, falling back to session ID from cookies.',
        );
      }
    }

    if (!sessionId) {
      logger.error('[handleOAuthCallbackAction] No session ID found in cookies or temporary session token.');

      return {
        error: 'No session found. Please start the authentication flow again.',
        success: false,
      };
    }

    // Exchange the authorization code for tokens
    const signInResult: Record<string, unknown> = await thunderIDClient.signIn(
      {
        code,
        session_state: sessionState,
        state,
      } as any,
      {},
      sessionId,
    );

    const config: ThunderIDNextConfig = await thunderIDClient.getConfiguration();

    if (signInResult) {
      try {
        const idToken: IdToken = await thunderIDClient.getDecodedIdToken(
          sessionId,
          (signInResult['id_token'] || signInResult['idToken']) as string,
        );
        const accessToken: string = (signInResult['accessToken'] || signInResult['access_token']) as string;
        const refreshToken: string = (signInResult['refreshToken'] as string | undefined) ?? '';
        const userIdFromToken: string = (idToken.sub || signInResult['sub'] || sessionId) as string;
        const scopes: string = signInResult['scope'] as string;
        const organizationId: string | undefined = (idToken['user_org'] || idToken['organization_id']) as
          | string
          | undefined;
        const expiresIn: number = signInResult['expiresIn'] as number;
        const sessionCookieExpiryTime: number = SessionManager.resolveSessionCookieExpiry(
          config.sessionCookie?.expiryTime,
        );

        const sessionToken: string = await SessionManager.createSessionToken(
          accessToken,
          userIdFromToken,
          sessionId,
          scopes,
          expiresIn,
          refreshToken,
          organizationId,
          {sid: typeof idToken['sid'] === 'string' ? idToken['sid'] : undefined},
        );

        setChunkedCookie(
          cookieStore,
          SessionManager.getSessionCookieName(),
          sessionToken,
          SessionManager.getSessionCookieOptions(sessionCookieExpiryTime),
        );

        cookieStore.delete(SessionManager.getTempSessionCookieName());
      } catch (error) {
        logger.error(
          `[handleOAuthCallbackAction] Failed to create JWT session, continuing with legacy session:
          ${typeof error === 'string' ? error : JSON.stringify(error)}`,
        );
      }
    }

    const afterSignInUrl: string = config.afterSignInUrl || '/';

    return {
      redirectUrl: afterSignInUrl,
      success: true,
    };
  } catch (error) {
    let errorMessage = 'Authentication failed';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as {message: unknown}).message);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      error: errorMessage,
      success: false,
    };
  }
};

export default handleOAuthCallbackAction;
