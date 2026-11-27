// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {hkdfSync} from 'node:crypto';
import {CompactEncrypt, compactDecrypt} from 'jose';
import {afterEach, describe, expect, it, vi} from 'vitest';
import CookieConfig from '../constants/CookieConfig';
import SessionCookie, {SessionCookieError} from '../utils/SessionCookie';

const SECRET = 'a-session-secret-that-is-at-least-32-bytes';

// The key every implementation derives, computed here with Node's own HKDF rather than the code under test.
const contractKey = (secret: string): Uint8Array =>
  new Uint8Array(hkdfSync('sha256', secret, new Uint8Array(0), SessionCookie.KEY_INFO, 32));

const now = (): number => Math.floor(Date.now() / 1000);

const codeOf = async (promise: Promise<unknown>): Promise<string | undefined> => {
  try {
    await promise;

    return undefined;
  } catch (error) {
    return error instanceof SessionCookieError ? error.code : `not a SessionCookieError: ${String(error)}`;
  }
};

describe('SessionCookie', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the claims it sealed, with iat and exp', async () => {
    const sealed: string = await SessionCookie.seal({accessToken: 'at', sub: 'user-1'}, SECRET, now() + 60);
    const claims = await SessionCookie.unseal<{accessToken: string; sub: string}>(sealed, SECRET);

    expect(claims.accessToken).toBe('at');
    expect(claims.sub).toBe('user-1');
    expect(claims.exp).toBe(now() + 60);
    expect(claims.iat).toBeLessThanOrEqual(now());
  });

  it('keeps no claim readable without the secret', async () => {
    const sealed: string = await SessionCookie.seal({accessToken: 'secret-access-token'}, SECRET, now() + 60);
    const readable: string = sealed
      .split('.')
      .map((part: string) => Buffer.from(part, 'base64url').toString('latin1'))
      .join('');

    expect(readable).not.toContain('secret-access-token');
  });

  it('writes a standard compact JWE that jose decrypts with the contract key', async () => {
    const sealed: string = await SessionCookie.seal({sub: 'user-1'}, SECRET, now() + 60);
    const {plaintext, protectedHeader} = await compactDecrypt(sealed, contractKey(SECRET));

    expect(protectedHeader).toEqual({alg: 'dir', enc: 'A256GCM', typ: 'JWT'});
    expect((JSON.parse(new TextDecoder().decode(plaintext)) as {sub: string}).sub).toBe('user-1');
  });

  it('reads a cookie another implementation wrote with the contract key', async () => {
    const claims = {exp: now() + 60, iat: now(), sub: 'from-go'};
    const written: string = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(claims)))
      .setProtectedHeader({alg: 'dir', enc: 'A256GCM'})
      .encrypt(contractKey(SECRET));

    expect((await SessionCookie.unseal<{sub: string}>(written, SECRET)).sub).toBe('from-go');
  });

  it('refuses a cookie sealed with another secret', async () => {
    const sealed: string = await SessionCookie.seal({}, `${SECRET}-other`, now() + 60);

    expect(await codeOf(SessionCookie.unseal(sealed, SECRET))).toBe('undecryptable');
  });

  it('refuses a cookie whose ciphertext was changed', async () => {
    const parts: string[] = (await SessionCookie.seal({role: 'user'}, SECRET, now() + 60)).split('.');
    const ciphertext: Buffer = Buffer.from(parts[3], 'base64url');

    ciphertext.writeUInt8(ciphertext.readUInt8(0) ^ 1, 0);
    parts[3] = ciphertext.toString('base64url');

    expect(await codeOf(SessionCookie.unseal(parts.join('.'), SECRET))).toBe('undecryptable');
  });

  it('refuses a cookie whose header was changed, since the header is authenticated', async () => {
    const parts: string[] = (await SessionCookie.seal({}, SECRET, now() + 60)).split('.');

    parts[0] = Buffer.from(JSON.stringify({alg: 'dir', enc: 'A256GCM', typ: 'JWT', kid: 'x'})).toString('base64url');

    expect(await codeOf(SessionCookie.unseal(parts.join('.'), SECRET))).toBe('undecryptable');
  });

  it('refuses any other algorithm, and compression', async () => {
    const parts: string[] = (await SessionCookie.seal({}, SECRET, now() + 60)).split('.');
    const withHeader = (header: object): string =>
      [Buffer.from(JSON.stringify(header)).toString('base64url'), ...parts.slice(1)].join('.');

    expect(await codeOf(SessionCookie.unseal(withHeader({alg: 'dir', enc: 'A128GCM'}), SECRET))).toBe('unsupported');
    expect(await codeOf(SessionCookie.unseal(withHeader({alg: 'A256KW', enc: 'A256GCM'}), SECRET))).toBe('unsupported');
    expect(await codeOf(SessionCookie.unseal(withHeader({alg: 'dir', enc: 'A256GCM', zip: 'DEF'}), SECRET))).toBe(
      'unsupported',
    );
  });

  it('refuses a signed JWT, such as a cookie from an earlier SDK version', async () => {
    const legacy = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.c2lnbmF0dXJl';

    expect(await codeOf(SessionCookie.unseal(legacy, SECRET))).toBe('malformed');
    expect(await codeOf(SessionCookie.unseal('not-a-cookie', SECRET))).toBe('malformed');
    expect(await codeOf(SessionCookie.unseal('a.b.c.d.e', SECRET))).toBe('malformed');
  });

  it('refuses an expired cookie unless asked to ignore the expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const sealed: string = await SessionCookie.seal({sub: 'user-1'}, SECRET, now() + 60);

    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'));

    expect(await codeOf(SessionCookie.unseal(sealed, SECRET))).toBe('expired');
    expect(await codeOf(SessionCookie.unseal(sealed, SECRET, {clockTolerance: 5}))).toBeUndefined();
    expect((await SessionCookie.unseal<{sub: string}>(sealed, SECRET, {ignoreExpiry: true})).sub).toBe('user-1');
  });

  it('uses a fresh IV each time', async () => {
    const a: string = await SessionCookie.seal({}, SECRET, now() + 60);
    const b: string = await SessionCookie.seal({}, SECRET, now() + 60);

    expect(a.split('.')[2]).not.toBe(b.split('.')[2]);
  });

  it('accepts only secrets of at least 32 bytes', () => {
    expect(SessionCookie.isUsableSecret(SECRET)).toBe(true);
    expect(SessionCookie.isUsableSecret('x'.repeat(31))).toBe(false);
    expect(SessionCookie.isUsableSecret(undefined)).toBe(false);
  });
});

describe('CookieConfig.withHostPrefix', () => {
  it('adds __Host- only to a Secure cookie, and only once', () => {
    expect(CookieConfig.withHostPrefix('thunderid-session', true)).toBe('__Host-thunderid-session');
    expect(CookieConfig.withHostPrefix('thunderid-session', false)).toBe('thunderid-session');
    expect(CookieConfig.withHostPrefix('__Host-session', true)).toBe('__Host-session');
  });
});

describe('CookieConfig names', () => {
  it('names the cookies after the vendor, in lowercase with hyphens', () => {
    expect(CookieConfig.getSessionCookieName()).toBe('thunderid-session');
    expect(CookieConfig.getTempSessionCookieName()).toBe('thunderid-session-state');
    expect(CookieConfig.getSessionCookieName('acme')).toBe('acme-session');
  });
});
