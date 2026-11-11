// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {
  generateSessionId,
  EmbeddedSignInFlowStatus,
  EmbeddedFlowExecuteRequestConfig,
  IdToken,
  isEmpty,
  ServerError,
  ThunderIDAPIError,
} from '@thunderid/node';
import {cookies} from 'next/headers';
import {ThunderIDNextConfig} from '../../../models/config';
import {getChunkedCookie, setChunkedCookie} from '../../../utils/chunkedCookie';
import logger from '../../../utils/logger';
import SessionManager, {SessionTokenPayload} from '../../../utils/SessionManager';
import getClient from '../../getClient';

type RequestCookies = Awaited<ReturnType<typeof cookies>>;

/**
 * Server action for signing in a user.
 * Handles the embedded sign-in flow and manages session cookies.
 *
 * @param payload - The embedded sign-in flow payload
 * @param request - The embedded flow execute request config
 * @returns Promise that resolves when sign-in is complete
 */
const signInAction = async (
  payload?: any,
  request?: EmbeddedFlowExecuteRequestConfig,
): Promise<{
  data?:
    | {
        afterSignInUrl?: string;
        signInUrl?: string;
      }
    | Record<string, unknown>;
  error?: string;
  serverError?: ServerError;
  statusCode?: number;
  success: boolean;
}> => {
  try {
    const client = getClient();
    const cookieStore: RequestCookies = await cookies();

    let sessionId: string | undefined;

    const existingSessionToken: string | undefined = getChunkedCookie(
      cookieStore,
      SessionManager.getSessionCookieName(),
    );

    if (existingSessionToken) {
      try {
        const sessionPayload: SessionTokenPayload = await SessionManager.verifySessionToken(existingSessionToken);
        sessionId = sessionPayload.sessionId;
      } catch {
        // Invalid session token, will create new temp session
      }
    }

    if (!sessionId) {
      const tempSessionToken: string | undefined = cookieStore.get(SessionManager.getTempSessionCookieName())?.value;

      if (tempSessionToken) {
        try {
          const tempSession: {sessionId: string} = await SessionManager.verifyTempSession(tempSessionToken);
          sessionId = tempSession.sessionId;
        } catch {
          // Invalid temp session, will create new one
        }
      }
    }

    if (!sessionId) {
      sessionId = generateSessionId();

      const tempSessionToken: string = await SessionManager.createTempSession(sessionId);

      cookieStore.set(
        SessionManager.getTempSessionCookieName(),
        tempSessionToken,
        SessionManager.getTempSessionCookieOptions(),
      );
    }

    // If no payload provided, redirect to sign-in URL for redirect-based sign-in.
    if (!payload || isEmpty(payload)) {
      const defaultSignInUrl: string = await client.getAuthorizeRequestUrl({}, sessionId);
      return {data: {signInUrl: String(defaultSignInUrl)}, success: true};
    }

    // Handle embedded sign-in flow
    const response: any = await client.signIn(payload, request!, sessionId);

    if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
      // On the V2 platform, a completed embedded flow (without a preceding `/authorize` redirect,
      // i.e. no `authId`) returns a self-contained JWT `assertion` rather than an authorization
      // code to exchange. This mirrors how @thunderid/react and @thunderid/vue treat it: the
      // assertion is used directly as the bearer session token.
      if (!response.assertion) {
        throw new Error('[signInAction] Flow completed without an assertion.');
      }

      const idToken: IdToken = await client.getDecodedIdToken(sessionId, response.assertion);
      const userIdFromToken: string = (idToken.sub as string | undefined) ?? sessionId;
      const organizationId: string | undefined = (idToken['user_org'] || idToken['organization_id']) as
        | string
        | undefined;
      const scopes: string = (idToken['scope'] as string | undefined) ?? '';
      const iat: number = (idToken['iat'] as number | undefined) ?? Math.floor(Date.now() / 1000);
      const exp: number = (idToken['exp'] as number | undefined) ?? iat + 3600;
      const expiresIn: number = Math.max(exp - iat, 0);

      const config: ThunderIDNextConfig = await client.getConfiguration();
      const sessionCookieExpiryTime: number = SessionManager.resolveSessionCookieExpiry(
        config.sessionCookie?.expiryTime,
      );

      const sessionToken: string = await SessionManager.createSessionToken(
        response.assertion,
        userIdFromToken,
        sessionId,
        scopes,
        expiresIn,
        '',
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

      const afterSignInUrl: string = await (await client.getStorageManager()).getConfigDataParameter('afterSignInUrl');
      return {data: {afterSignInUrl: String(afterSignInUrl)}, success: true};
    }

    return {data: response as Record<string, unknown>, success: true};
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof (error as any)?.message === 'string'
          ? (error as any).message
          : String(error);
    logger.error(`[signInAction] Error during sign-in: ${message}`);
    // A server action returns plain data, so the server's error envelope and status go back as fields. The
    // client rebuilds the API error from them, to tell the failures apart, e.g. an expired flow execution.
    if (error instanceof ThunderIDAPIError && error.serverError) {
      return {error: message, serverError: error.serverError, statusCode: error.statusCode, success: false};
    }
    return {error: message, success: false};
  }
};

export default signInAction;
