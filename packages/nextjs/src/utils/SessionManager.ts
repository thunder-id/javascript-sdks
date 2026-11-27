// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ThunderIDRuntimeError,
  CookieConfig,
  SessionCookie,
  SessionCookieSameSite,
  resolveSessionCookieSameSite,
  resolveSessionSecret,
} from '@thunderid/node';
import type {JWTPayload} from 'jose';
import {getLoggedOutSessions} from './loggedOutSessions';
import {DEFAULT_SESSION_COOKIE_EXPIRY_TIME} from '../constants/sessionConstants';

const TEMP_SESSION_TTL_SECONDS: number = 15 * 60;

/**
 * Session token payload interface
 */
export interface SessionTokenPayload extends JWTPayload {
  /** The access token. Never sent to the browser. */
  accessToken: string;
  /** The raw ID token, so the user's claims are at hand on any instance without a session store. */
  idToken?: string;
  /** Expiration timestamp — doubles as the access token expiry (JWT exp == access token exp) */
  exp: number;
  /** Issued at timestamp */
  iat: number;
  /** Organization ID if applicable */
  organizationId?: string;
  /** The refresh token; empty string if not provided by the auth server */
  refreshToken: string;
  /** OAuth scopes */
  scopes: string[];
  /** Session ID */
  sessionId: string;
  /** The server session this session joined, from the `sid` of the ID token. */
  sid?: string;
  /** When the user signed in, in seconds. Kept across token refresh, unlike `iat`. */
  signedInAt?: number;
  /** User ID */
  sub: string;
  /** Token type discriminant — must be 'session' for access-session JWTs */
  type: 'session';
}

/**
 * Reads and writes the session cookies. Their contents are encrypted in the BFF contract's session cookie
 * format (see `SessionCookie` in `@thunderid/node`), so the tokens in them cannot be read from the browser.
 */
class SessionManager {
  /**
   * The secret the session cookies are encrypted with: `THUNDERID_SESSION_SECRET`, or the deprecated
   * `THUNDERID_SECRET`. Throws in production when neither is set or the secret is shorter than 32 bytes.
   */
  private static getSecret(): string {
    return resolveSessionSecret({deprecatedEnv: ['THUNDERID_SECRET'], sdk: 'nextjs'});
  }

  /**
   * Whether the session cookies are `Secure`, and so carry the `__Host-` prefix.
   */
  private static isSecure(): boolean {
    return process.env['NODE_ENV'] === 'production';
  }

  /**
   * Create a temporary session cookie for login initiation
   */
  static async createTempSession(sessionId: string, returnTo?: string): Promise<string> {
    return SessionCookie.seal(
      {sessionId, type: 'temp', ...(returnTo ? {returnTo} : {})},
      this.getSecret(),
      Math.floor(Date.now() / 1000) + TEMP_SESSION_TTL_SECONDS,
    );
  }

  /**
   * Resolve the session cookie expiry time in seconds.
   *
   * Resolution order (first defined value wins):
   *   1. `configuredExpiry` — value from `ThunderIDNodeConfig.sessionCookie?.expiryTime`
   *   2. `THUNDERID_SESSION_COOKIE_EXPIRY_TIME` environment variable
   *   3. `DEFAULT_SESSION_COOKIE_EXPIRY_TIME` (24 hours)
   */
  static resolveSessionCookieExpiry(configuredExpiry?: number): number {
    if (configuredExpiry != null && configuredExpiry > 0) {
      return configuredExpiry;
    }

    const envValue: string | undefined = process.env['THUNDERID_SESSION_COOKIE_EXPIRY_TIME'];

    if (envValue) {
      const parsed: number = parseInt(envValue, 10);

      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return DEFAULT_SESSION_COOKIE_EXPIRY_TIME;
  }

  static async createSessionToken(
    accessToken: string,
    userId: string,
    sessionId: string,
    scopes: string,
    accessTokenTtlSeconds: number,
    refreshToken: string,
    organizationId?: string,
    serverSession?: {idToken?: string; sid?: string; signedInAt?: number},
  ): Promise<string> {
    return SessionCookie.seal(
      {
        accessToken,
        idToken: serverSession?.idToken,
        organizationId,
        refreshToken,
        scopes,
        sessionId,
        // What a back-channel logout matches this session by.
        sid: serverSession?.sid,
        signedInAt: serverSession?.signedInAt ?? Math.floor(Date.now() / 1000),
        sub: userId,
        type: 'session',
      } as Omit<SessionTokenPayload, 'iat' | 'exp'>,
      this.getSecret(),
      Math.floor(Date.now() / 1000) + accessTokenTtlSeconds,
    );
  }

  /**
   * Verify and decode a session token
   */
  static async verifySessionToken(token: string): Promise<SessionTokenPayload> {
    try {
      const payload: SessionTokenPayload = await SessionCookie.unseal<SessionTokenPayload>(token, this.getSecret());

      if (payload.type !== 'session') {
        throw new Error('Invalid token type');
      }

      await this.refuseLoggedOutSession(payload);

      return payload;
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Invalid session token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'invalid-session-token',
        'nextjs',
        'Session token verification failed',
      );
    }
  }

  /**
   * Verify a session token for refresh. Decrypts the token, which also authenticates it, and checks and the
   * `type === 'session'` discriminant but intentionally skips the `exp` check
   * so an expired access token can still be exchanged for a new one.
   *
   * Session lifetime is still bounded — the cookie's `maxAge` is set from
   * `sessionCookieExpiryTime`, so the browser drops an over-age session regardless
   * of the access-token exp embedded in the JWT.
   *
   * Never use the returned payload for authorization.
   */
  static async verifySessionTokenForRefresh(token: string): Promise<SessionTokenPayload> {
    try {
      const payload: SessionTokenPayload = await SessionCookie.unseal<SessionTokenPayload>(token, this.getSecret(), {
        ignoreExpiry: true,
      });

      if (payload.type !== 'session') {
        throw new Error('Invalid token type');
      }

      await this.refuseLoggedOutSession(payload);

      return payload;
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Invalid session token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'invalid-session-token-for-refresh',
        'nextjs',
        'Session token signature or type check failed during refresh',
      );
    }
  }

  /**
   * Verify and decode a temporary session token
   */
  static async verifyTempSession(token: string): Promise<{returnTo?: string; sessionId: string}> {
    try {
      const payload: {returnTo?: unknown; sessionId?: unknown; type?: unknown} = await SessionCookie.unseal(
        token,
        this.getSecret(),
      );

      if (payload.type !== 'temp' || typeof payload.sessionId !== 'string') {
        throw new Error('Invalid token type');
      }

      return {
        sessionId: payload.sessionId,
        ...(typeof payload.returnTo === 'string' ? {returnTo: payload.returnTo} : {}),
      };
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Invalid temporary session token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'invalid-temp-session-token',
        'nextjs',
        'Temporary session token verification failed',
      );
    }
  }

  /**
   * Throws when a back-channel logout has ended the session this cookie carries. The cookie still
   * decrypts, so this is the only thing that stops it from being used.
   */
  private static async refuseLoggedOutSession(payload: SessionTokenPayload): Promise<void> {
    const loggedOut: boolean = await getLoggedOutSessions().isLoggedOut({
      sid: payload.sid,
      startedAt: payload.signedInAt ?? payload.iat,
      sub: payload.sub,
    });

    if (loggedOut) {
      throw new Error('The session was ended by a back-channel logout');
    }
  }

  /**
   * Session cookie options. `SameSite` is `Strict` unless `THUNDERID_SESSION_COOKIE_SAME_SITE` says otherwise.
   */
  static getSessionCookieOptions(maxAge: number): {
    httpOnly: boolean;
    maxAge: number;
    path: string;
    sameSite: SessionCookieSameSite;
    secure: boolean;
  } {
    return {
      httpOnly: true,
      maxAge,
      path: '/',
      sameSite: resolveSessionCookieSameSite(),
      secure: this.isSecure(),
    };
  }

  /**
   * Options of the cookie that carries a sign-in in progress. It is `Lax` whatever the session cookie is, so it
   * comes back on the redirect to the callback.
   */
  static getTempSessionCookieOptions(): {
    httpOnly: boolean;
    maxAge: number;
    path: string;
    sameSite: SessionCookieSameSite;
    secure: boolean;
  } {
    return {
      httpOnly: true,
      maxAge: TEMP_SESSION_TTL_SECONDS,
      path: '/',
      sameSite: 'lax' as const,
      secure: this.isSecure(),
    };
  }

  /**
   * Get session cookie name
   */
  static getSessionCookieName(): string {
    return CookieConfig.withHostPrefix(CookieConfig.getSessionCookieName(), this.isSecure());
  }

  /**
   * Get temporary session cookie name
   */
  static getTempSessionCookieName(): string {
    return CookieConfig.withHostPrefix(CookieConfig.getTempSessionCookieName(), this.isSecure());
  }
}

export default SessionManager;
