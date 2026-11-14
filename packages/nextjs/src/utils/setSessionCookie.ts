// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {IdToken} from '@thunderid/node';
import {cookies} from 'next/headers';
import {setChunkedCookie} from './chunkedCookie';
import SessionManager from './SessionManager';
import {ThunderIDNextConfig} from '../models/config';
import type ThunderIDNextClient from '../ThunderIDNextClient';

type RequestCookies = Awaited<ReturnType<typeof cookies>>;

/**
 * Writes the session cookie for the tokens the server issued to the session `sessionId`, so the
 * cookie carries their access token, scopes and organization.
 */
const setSessionCookie = async (
  client: ThunderIDNextClient,
  cookieStore: RequestCookies,
  sessionId: string,
  tokens: Record<string, unknown>,
  config: ThunderIDNextConfig,
): Promise<void> => {
  const idToken: IdToken = await client.getDecodedIdToken(
    sessionId,
    (tokens['id_token'] || tokens['idToken']) as string,
  );
  const accessToken: string = (tokens['accessToken'] || tokens['access_token']) as string;
  const refreshToken: string = (tokens['refreshToken'] as string | undefined) ?? '';
  const userIdFromToken: string = (idToken.sub || tokens['sub'] || sessionId) as string;
  const scopes: string = tokens['scope'] as string;
  const organizationId: string | undefined = (idToken['user_org'] || idToken['organization_id']) as string | undefined;
  const expiresIn: number = tokens['expiresIn'] as number;
  const sessionCookieExpiryTime: number = SessionManager.resolveSessionCookieExpiry(config.sessionCookie?.expiryTime);

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
};

export default setSessionCookie;
