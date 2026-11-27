// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The session cookie format of the BFF contract.
 *
 * A session cookie holds a JWE in compact serialization (RFC 7516) with `alg: dir` and `enc: A256GCM`.
 * Its plaintext is a JSON claim set with `iat` and `exp` in seconds. The content key is derived from the
 * session secret with HKDF-SHA256 (RFC 5869): an empty salt, and `info` set to {@link SessionCookie.KEY_INFO}.
 * Any implementation that follows these rules reads and writes the same cookie, whatever its language.
 *
 * This file uses only Web Crypto, so it runs on Node, on the Next.js Edge runtime and on Nitro. jose's JWE
 * code is not used: it imports a deflate helper that the Edge runtime rejects.
 */

const PROTECTED_HEADER: Readonly<{alg: 'dir'; enc: 'A256GCM'; typ: 'JWT'}> = {alg: 'dir', enc: 'A256GCM', typ: 'JWT'};

const IV_LENGTH = 12;

const TAG_LENGTH = 16;

const encoder: TextEncoder = new TextEncoder();

const decoder: TextDecoder = new TextDecoder();

/**
 * The claims every session cookie carries, besides its own.
 */
export interface SessionCookieClaims {
  /** When the cookie's contents expire, in seconds since the epoch. */
  exp: number;
  /** When the cookie was written, in seconds since the epoch. */
  iat: number;
}

/**
 * Why a session cookie was refused. A refused cookie is treated as no session.
 */
export type SessionCookieErrorCode = 'malformed' | 'unsupported' | 'undecryptable' | 'expired';

export class SessionCookieError extends Error {
  public readonly code: SessionCookieErrorCode;

  public constructor(code: SessionCookieErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'SessionCookieError';
  }
}

const getCrypto = (): Crypto => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is not available in this runtime. Session cookies need crypto.subtle.');
  }

  return globalThis.crypto;
};

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new SessionCookieError('malformed', 'The session cookie is not base64url encoded.');
  }

  const binary: string = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const ENCODED_HEADER: string = toBase64Url(encoder.encode(JSON.stringify(PROTECTED_HEADER)));

// Deriving the key is the slow part, and the secret rarely changes, so the last few keys are kept.
const keyCache: Map<string, Promise<CryptoKey>> = new Map<string, Promise<CryptoKey>>();

const KEY_CACHE_LIMIT = 4;

class SessionCookie {
  /** The HKDF `info` the content key is derived with. Changing it changes the cookie format. */
  public static readonly KEY_INFO: string = 'bff-session-cookie-v1';

  /** The shortest session secret accepted, in bytes. */
  public static readonly MIN_SECRET_LENGTH: number = 32;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Encrypts a claim set into a session cookie value.
   *
   * @param claims - The claims to keep. `iat` and `exp` are set here.
   * @param secret - The session secret.
   * @param expiresAt - When the claims expire, in seconds since the epoch.
   * @returns The JWE, in compact serialization.
   */
  public static async seal(claims: Record<string, unknown>, secret: string, expiresAt: number): Promise<string> {
    const crypto: Crypto = getCrypto();
    const key: CryptoKey = await SessionCookie.getKey(secret);
    const iv: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const plaintext: Uint8Array<ArrayBuffer> = encoder.encode(
      JSON.stringify({...claims, exp: Math.floor(expiresAt), iat: Math.floor(Date.now() / 1000)}),
    );
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        {additionalData: encoder.encode(ENCODED_HEADER), iv, name: 'AES-GCM', tagLength: TAG_LENGTH * 8},
        key,
        plaintext,
      ),
    );
    const ciphertext: Uint8Array = sealed.subarray(0, sealed.length - TAG_LENGTH);
    const tag: Uint8Array = sealed.subarray(sealed.length - TAG_LENGTH);

    // An empty second part: with `dir` there is no encrypted key.
    return `${ENCODED_HEADER}..${toBase64Url(iv)}.${toBase64Url(ciphertext)}.${toBase64Url(tag)}`;
  }

  /**
   * Decrypts a session cookie value.
   *
   * @param value - The cookie value.
   * @param secret - The session secret.
   * @param options - `ignoreExpiry` reads claims whose `exp` has passed, which a token refresh needs.
   *   `clockTolerance` is in seconds.
   * @returns The claims.
   * @throws {SessionCookieError} When the value is not a session cookie, was not made with this secret,
   *   or has expired.
   */
  public static async unseal<T extends object = Record<string, unknown>>(
    value: string,
    secret: string,
    options: {clockTolerance?: number; ignoreExpiry?: boolean} = {},
  ): Promise<T & SessionCookieClaims> {
    const parts: string[] = value.split('.');

    if (parts.length !== 5) {
      throw new SessionCookieError('malformed', 'The session cookie is not a compact JWE.');
    }

    const [encodedHeader, encryptedKey, encodedIv, encodedCiphertext, encodedTag] = parts as [
      string,
      string,
      string,
      string,
      string,
    ];

    let header: Record<string, unknown>;

    try {
      header = JSON.parse(decoder.decode(fromBase64Url(encodedHeader))) as Record<string, unknown>;
    } catch {
      throw new SessionCookieError('malformed', 'The session cookie header is not JSON.');
    }

    // Only the one algorithm pair is accepted, so a cookie cannot choose a weaker one.
    if (header['alg'] !== PROTECTED_HEADER.alg || header['enc'] !== PROTECTED_HEADER.enc || 'zip' in header) {
      throw new SessionCookieError('unsupported', 'The session cookie uses an unsupported algorithm.');
    }
    if (encryptedKey !== '') {
      throw new SessionCookieError('malformed', 'A session cookie made with `dir` has no encrypted key.');
    }

    const iv: Uint8Array<ArrayBuffer> = fromBase64Url(encodedIv);
    const ciphertext: Uint8Array = fromBase64Url(encodedCiphertext);
    const tag: Uint8Array = fromBase64Url(encodedTag);

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
      throw new SessionCookieError('malformed', 'The session cookie has a wrong IV or tag length.');
    }

    const sealed = new Uint8Array(ciphertext.length + TAG_LENGTH);

    sealed.set(ciphertext);
    sealed.set(tag, ciphertext.length);

    let plaintext: ArrayBuffer;

    try {
      plaintext = await getCrypto().subtle.decrypt(
        {additionalData: encoder.encode(encodedHeader), iv, name: 'AES-GCM', tagLength: TAG_LENGTH * 8},
        await SessionCookie.getKey(secret),
        sealed,
      );
    } catch {
      // A wrong secret, a rotated one, or a cookie that was changed.
      throw new SessionCookieError('undecryptable', 'The session cookie could not be decrypted.');
    }

    let claims: T & SessionCookieClaims;

    try {
      claims = JSON.parse(decoder.decode(plaintext)) as T & SessionCookieClaims;
    } catch {
      throw new SessionCookieError('malformed', 'The session cookie claims are not JSON.');
    }

    if (typeof claims !== 'object' || claims === null || typeof claims.exp !== 'number') {
      throw new SessionCookieError('malformed', 'The session cookie claims have no `exp`.');
    }
    if (!options.ignoreExpiry && claims.exp + (options.clockTolerance ?? 0) <= Math.floor(Date.now() / 1000)) {
      throw new SessionCookieError('expired', 'The session cookie has expired.');
    }

    return claims;
  }

  /**
   * Checks a session secret. A secret shorter than {@link SessionCookie.MIN_SECRET_LENGTH} bytes is refused.
   *
   * @param secret - The session secret.
   * @returns Whether the secret can be used.
   */
  public static isUsableSecret(secret: string | undefined): secret is string {
    return typeof secret === 'string' && encoder.encode(secret).length >= SessionCookie.MIN_SECRET_LENGTH;
  }

  private static getKey(secret: string): Promise<CryptoKey> {
    const cached: Promise<CryptoKey> | undefined = keyCache.get(secret);

    if (cached) {
      return cached;
    }

    const subtle: SubtleCrypto = getCrypto().subtle;
    const key: Promise<CryptoKey> = subtle
      .importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey'])
      .then((material: CryptoKey) =>
        subtle.deriveKey(
          {hash: 'SHA-256', info: encoder.encode(SessionCookie.KEY_INFO), name: 'HKDF', salt: new Uint8Array(0)},
          material,
          {length: 256, name: 'AES-GCM'},
          false,
          ['encrypt', 'decrypt'],
        ),
      );

    if (keyCache.size >= KEY_CACHE_LIMIT) {
      keyCache.delete(keyCache.keys().next().value as string);
    }
    keyCache.set(secret, key);
    // A failed derivation must not stay cached.
    key.catch(() => keyCache.delete(secret));

    return key;
  }
}

export default SessionCookie;
