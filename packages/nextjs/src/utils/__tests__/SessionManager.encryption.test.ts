// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {SignJWT} from 'jose';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import SessionManager from '../SessionManager';

const SECRET = 'a-session-secret-that-is-at-least-32-bytes';

const createSession = (ttlSeconds = 60): Promise<string> =>
  SessionManager.createSessionToken('access-token', 'user-1', 'session-1', 'openid', ttlSeconds, 'refresh-token');

describe('SessionManager session cookie', () => {
  beforeEach(() => {
    vi.stubEnv('THUNDERID_SESSION_SECRET', SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('encrypts the tokens, so the cookie does not show them', async () => {
    const token: string = await createSession();
    const readable: string = token
      .split('.')
      .map((part: string) => Buffer.from(part, 'base64url').toString('latin1'))
      .join('');

    expect(token.split('.')).toHaveLength(5);
    expect(readable).not.toContain('access-token');
    expect(readable).not.toContain('refresh-token');
  });

  it('reads back what it wrote', async () => {
    const payload = await SessionManager.verifySessionToken(await createSession());

    expect(payload).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      sessionId: 'session-1',
      sub: 'user-1',
      type: 'session',
    });
  });

  it('refuses an expired session, but lets a refresh read it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token: string = await createSession(60);

    vi.setSystemTime(new Date('2026-01-01T00:02:00Z'));

    await expect(SessionManager.verifySessionToken(token)).rejects.toThrow();
    await expect(SessionManager.verifySessionTokenForRefresh(token)).resolves.toMatchObject({sub: 'user-1'});
  });

  it('treats a signed cookie from an earlier version as no session', async () => {
    const legacy: string = await new SignJWT({accessToken: 'at', sessionId: 's', type: 'session'})
      .setProtectedHeader({alg: 'HS256'})
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));

    await expect(SessionManager.verifySessionToken(legacy)).rejects.toThrow();
    await expect(SessionManager.verifySessionTokenForRefresh(legacy)).rejects.toThrow();
  });

  it('does not accept a temporary session as a session, or the reverse', async () => {
    const temp: string = await SessionManager.createTempSession('session-1');

    await expect(SessionManager.verifyTempSession(temp)).resolves.toEqual({sessionId: 'session-1'});
    await expect(SessionManager.verifySessionToken(temp)).rejects.toThrow();
    await expect(SessionManager.verifyTempSession(await createSession())).rejects.toThrow();
  });

  it('still reads the deprecated THUNDERID_SECRET', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('THUNDERID_SESSION_SECRET', '');
    vi.stubEnv('THUNDERID_SECRET', SECRET);
    const token: string = await createSession();

    vi.stubEnv('THUNDERID_SECRET', '');
    vi.stubEnv('THUNDERID_SESSION_SECRET', SECRET);

    await expect(SessionManager.verifySessionToken(token)).resolves.toMatchObject({sub: 'user-1'});
  });

  it('names the cookies with __Host- and makes them Secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(SessionManager.getSessionCookieName()).toMatch(/^__Host-/);
    expect(SessionManager.getTempSessionCookieName()).toMatch(/^__Host-/);
    expect(SessionManager.getSessionCookieOptions(60)).toMatchObject({path: '/', secure: true});
  });

  it('leaves the prefix off on a plain-HTTP development server', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(SessionManager.getSessionCookieName()).not.toMatch(/^__Host-/);
    expect(SessionManager.getSessionCookieOptions(60).secure).toBe(false);
  });
});

describe('SessionManager cookie SameSite', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('makes the session cookie Strict and the sign-in cookie Lax by default', () => {
    expect(SessionManager.getSessionCookieOptions(60).sameSite).toBe('strict');
    expect(SessionManager.getTempSessionCookieOptions().sameSite).toBe('lax');
    expect(SessionManager.getTempSessionCookieName()).toBe('thunderid-session-state');
  });

  it('makes the session cookie Lax when THUNDERID_SESSION_COOKIE_SAME_SITE says so', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('THUNDERID_SESSION_COOKIE_SAME_SITE', 'lax');

    expect(SessionManager.getSessionCookieOptions(60).sameSite).toBe('lax');
  });
});
