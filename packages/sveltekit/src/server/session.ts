import {CookieConfig} from '@thunderid/node';
import type {IdToken, TokenResponse} from '@thunderid/node';
import {SignJWT, jwtVerify, decodeJwt} from 'jose';
import {getLogger} from '../logger/LoggerAdapter';
import type {ThunderIDSessionPayload} from '../models/session';

const DEFAULT_EXPIRY_SECONDS = 3600;

function getSecret(sessionSecret?: string): Uint8Array {
  const secret: string | undefined = sessionSecret || process.env['THUNDERID_SESSION_SECRET'];
  const logger = getLogger();

  if (!secret) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(
        '[thunderid] THUNDERID_SESSION_SECRET environment variable is required in production. ' +
          'Set it to a secure random string of at least 32 characters.',
      );
    }
    logger.warn('Using default session secret for development. Set THUNDERID_SESSION_SECRET for production.');
    return new TextEncoder().encode('thunderid-dev-secret-not-for-production');
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  params: {
    accessToken: string;
    accessTokenExpiresAt?: number;
    expirySeconds?: number;
    idToken?: string;
    refreshToken?: string;
    scopes: string;
    sessionId: string;
    userId: string;
  },
  sessionSecret?: string,
): Promise<string> {
  const secret: Uint8Array = getSecret(sessionSecret);

  return new SignJWT({
    accessToken: params.accessToken,
    accessTokenExpiresAt: params.accessTokenExpiresAt,
    idToken: params.idToken,
    refreshToken: params.refreshToken,
    scopes: params.scopes,
    sessionId: params.sessionId,
    type: 'session',
  } as Omit<ThunderIDSessionPayload, 'sub' | 'iat' | 'exp'>)
    .setProtectedHeader({alg: 'HS256'})
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(Date.now() / 1000 + (params.expirySeconds ?? DEFAULT_EXPIRY_SECONDS))
    .sign(secret);
}

export async function createTempSessionToken(
  sessionId: string,
  sessionSecret?: string,
  returnTo?: string,
  nonce?: string,
): Promise<string> {
  const secret: Uint8Array = getSecret(sessionSecret);

  const payload: Record<string, unknown> = {
    sessionId,
    type: 'temp',
  };

  if (returnTo) {
    payload['returnTo'] = returnTo;
  }

  if (nonce) {
    payload['nonce'] = nonce;
  }

  return new SignJWT(payload).setProtectedHeader({alg: 'HS256'}).setIssuedAt().setExpirationTime('15m').sign(secret);
}

export async function verifySessionToken(
  token: string,
  sessionSecret?: string,
): Promise<ThunderIDSessionPayload> {
  const secret: Uint8Array = getSecret(sessionSecret);
  const {payload} = await jwtVerify(token, secret);
  return payload as ThunderIDSessionPayload;
}

export async function verifyTempSessionToken(
  token: string,
  sessionSecret?: string,
): Promise<{returnTo?: string; sessionId: string; nonce?: string}> {
  const secret: Uint8Array = getSecret(sessionSecret);
  const {payload} = await jwtVerify(token, secret);

  if (payload['type'] !== 'temp') {
    throw new Error('Invalid token type: expected temp session');
  }

  return {
    returnTo: payload['returnTo'] as string | undefined,
    sessionId: payload['sessionId'] as string,
    nonce: payload['nonce'] as string | undefined,
  };
}

export function getSessionCookieName(): string {
  return CookieConfig.SESSION_COOKIE_NAME;
}

export function getTempSessionCookieName(): string {
  return CookieConfig.TEMP_SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions(): {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: 'lax';
  secure: boolean;
} {
  return {
    httpOnly: true,
    maxAge: DEFAULT_EXPIRY_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env['NODE_ENV'] === 'production',
  };
}

export function getTempSessionCookieOptions(): {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: 'lax';
  secure: boolean;
} {
  return {
    httpOnly: true,
    maxAge: 15 * 60,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env['NODE_ENV'] === 'production',
  };
}

export async function issueSessionCookie(
  event: {cookies: {set: (name: string, value: string, options: any) => void}},
  sessionId: string,
  tokenResponse: TokenResponse,
  sessionSecret?: string,
): Promise<ThunderIDSessionPayload> {
  const idToken: IdToken = decodeJwt(tokenResponse.idToken) as IdToken;

  const userId: string = idToken.sub || sessionId;
  const expiresInSeconds: number = parseInt(tokenResponse.expiresIn ?? '3600', 10);
  const accessTokenExpiresAt: number =
    Math.floor(Date.now() / 1000) + (Number.isFinite(expiresInSeconds) ? expiresInSeconds : 3600);

  const sessionToken: string = await createSessionToken(
    {
      accessToken: tokenResponse.accessToken,
      accessTokenExpiresAt,
      idToken: tokenResponse.idToken || undefined,
      refreshToken: tokenResponse.refreshToken || undefined,
      scopes: tokenResponse.scope || '',
      sessionId,
      userId,
    },
    sessionSecret,
  );

  event.cookies.set(getSessionCookieName(), sessionToken, getSessionCookieOptions());

  return {
    accessToken: tokenResponse.accessToken,
    accessTokenExpiresAt,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    iat: Math.floor(Date.now() / 1000),
    idToken: tokenResponse.idToken || undefined,
    refreshToken: tokenResponse.refreshToken || undefined,
    scopes: tokenResponse.scope || '',
    sessionId,
    sub: userId,
  } as ThunderIDSessionPayload;
}
