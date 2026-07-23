import {describe, it, expect, beforeAll} from 'vitest';
import {
  createSessionToken,
  createTempSessionToken,
  verifySessionToken,
  verifyTempSessionToken,
  getSessionCookieName,
  getTempSessionCookieName,
  getSessionCookieOptions,
  getTempSessionCookieOptions,
} from '../session';

const TEST_SECRET = 'test-session-secret-at-least-32-chars!!';

describe('Session token utilities', () => {
  beforeAll(() => {
    process.env['THUNDERID_SESSION_SECRET'] = TEST_SECRET;
  });

  describe('createSessionToken / verifySessionToken', () => {
    it('should create and verify a session token', async () => {
      const token = await createSessionToken({
        accessToken: 'at-123',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
        scopes: 'openid profile',
        sessionId: 'sess-001',
        userId: 'user-001',
      });

      const payload = await verifySessionToken(token);
      expect(payload.accessToken).toBe('at-123');
      expect(payload.scopes).toBe('openid profile');
      expect(payload.sessionId).toBe('sess-001');
      expect(payload.sub).toBe('user-001');
      expect(payload['type']).toBe('session');
    });

    it('should include idToken and refreshToken when provided', async () => {
      const token = await createSessionToken({
        accessToken: 'at-456',
        idToken: 'id-token-value',
        refreshToken: 'rt-789',
        scopes: 'openid',
        sessionId: 'sess-002',
        userId: 'user-002',
      });

      const payload = await verifySessionToken(token);
      expect(payload.idToken).toBe('id-token-value');
      expect(payload.refreshToken).toBe('rt-789');
    });

    it('should respect custom expirySeconds', async () => {
      const token = await createSessionToken({
        accessToken: 'at',
        expirySeconds: 60,
        scopes: 'openid',
        sessionId: 'sess-003',
        userId: 'user-003',
      });

      const payload = await verifySessionToken(token);
      const ttl = payload.exp - payload.iat;
      expect(ttl).toBeLessThanOrEqual(65);
      expect(ttl).toBeGreaterThanOrEqual(55);
    });

    it('should reject a token signed with a different secret', async () => {
      const token = await createSessionToken(
        {
          accessToken: 'at',
          scopes: 'openid',
          sessionId: 'sess-004',
          userId: 'user-004',
        },
        'different-secret-that-is-long-enough-for-test',
      );

      await expect(verifySessionToken(token)).rejects.toThrow();
    });
  });

  describe('createTempSessionToken / verifyTempSessionToken', () => {
    it('should create and verify a temp session token', async () => {
      const token = await createTempSessionToken('sess-temp-001');
      const payload = await verifyTempSessionToken(token);
      expect(payload.sessionId).toBe('sess-temp-001');
      expect(payload.returnTo).toBeUndefined();
    });

    it('should store returnTo when provided', async () => {
      const token = await createTempSessionToken('sess-temp-002', undefined, '/dashboard');
      const payload = await verifyTempSessionToken(token);
      expect(payload.sessionId).toBe('sess-temp-002');
      expect(payload.returnTo).toBe('/dashboard');
    });

    it('should store and return nonce when provided', async () => {
      const nonce: string = crypto.randomUUID();
      const token = await createTempSessionToken('sess-temp-003', undefined, undefined, nonce);
      const payload = await verifyTempSessionToken(token);
      expect(payload.sessionId).toBe('sess-temp-003');
      expect(payload.nonce).toBe(nonce);
    });

    it('should omit nonce from payload when not provided', async () => {
      const token = await createTempSessionToken('sess-temp-004');
      const payload = await verifyTempSessionToken(token);
      expect(payload.nonce).toBeUndefined();
    });

    it('should reject an expired temp token', async () => {
      const token = await createTempSessionToken('sess-temp-005');
      const payload = await verifyTempSessionToken(token);
      expect(payload.sessionId).toBe('sess-temp-005');
    });
  });

  describe('Cookie helpers', () => {
    it('should return consistent cookie names', () => {
      expect(getSessionCookieName()).toBe('__thunderid__session');
      expect(getTempSessionCookieName()).toBe('__thunderid__temp.session');
    });

    it('should return session cookie options', () => {
      const opts = getSessionCookieOptions();
      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('lax');
      expect(opts.path).toBe('/');
      expect(opts.maxAge).toBeGreaterThan(0);
    });

    it('should return temp session cookie options with 15m maxAge', () => {
      const opts = getTempSessionCookieOptions();
      expect(opts.httpOnly).toBe(true);
      expect(opts.maxAge).toBe(15 * 60);
    });
  });
});
