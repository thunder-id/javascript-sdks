// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CookieChunking, SessionCookieSameSite} from '@thunderid/node';

export interface ChunkedCookieOptions {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: SessionCookieSameSite;
  secure: boolean;
}

/** Minimal shape shared by `cookies()` (next/headers) and `NextRequest.cookies`. */
export interface ChunkedCookieReader {
  get(name: string): {value: string} | undefined;
}

/** Minimal shape shared by `cookies()` (next/headers) and `NextResponse.cookies`. */
/**
 * What a deletion repeats of the cookie's attributes. A browser ignores a deletion of a `__Host-` cookie
 * that is not `Secure` with `Path=/`. `maxAge` is left out: it would override the deletion's `Expires`.
 */
export type CookieDeletion = {name: string} & Omit<ChunkedCookieOptions, 'maxAge'>;

/**
 * The attributes a deletion of a cookie set with `options` repeats.
 */
export function toCookieDeletion(name: string, options: ChunkedCookieOptions): CookieDeletion {
  return {httpOnly: options.httpOnly, name, path: options.path, sameSite: options.sameSite, secure: options.secure};
}

export interface ChunkedCookieWriter {
  delete(cookie: CookieDeletion): void;
  getAll(): {name: string}[];
  set(name: string, value: string, options: ChunkedCookieOptions): void;
}

/**
 * Read a cookie that may have been split across `${name}.0`, `${name}.1`,
 * ... chunks, reassembling it into the original value. Falls back to the
 * unchunked `name` cookie when the value fit in a single cookie.
 */
export function getChunkedCookie(store: ChunkedCookieReader, name: string): string | undefined {
  return CookieChunking.join(name, (cookieName: string) => store.get(cookieName)?.value);
}

/**
 * Write a cookie value, splitting it across numbered `${name}.0`,
 * `${name}.1`, ... chunks once it would exceed the ~4KB per-cookie limit
 * browsers enforce, and reassembling transparently via {@link getChunkedCookie}.
 *
 * Clears any cookie names the previous value needed but the new one doesn't
 * (e.g. a smaller re-issued session that now fits in fewer chunks, or in a
 * single unchunked cookie). `store.getAll()` is used to discover those stale
 * names, so pass the store that reflects the cookies already present (for
 * `cookies()` that's the same store being written to; for middleware it
 * should be an adapter backed by the incoming `NextRequest.cookies`).
 */
export function setChunkedCookie(
  store: ChunkedCookieWriter,
  name: string,
  value: string,
  options: ChunkedCookieOptions,
): void {
  const existing: string[] = CookieChunking.filterChunkNames(
    name,
    store.getAll().map((cookie: {name: string}) => cookie.name),
  );
  const newChunks: Record<string, string> = CookieChunking.split(name, value);
  const newNames = new Set<string>(Object.keys(newChunks));

  for (const existingName of existing) {
    if (!newNames.has(existingName)) {
      store.delete(toCookieDeletion(existingName, options));
    }
  }

  for (const [chunkName, chunkValue] of Object.entries(newChunks)) {
    store.set(chunkName, chunkValue, options);
  }
}

/**
 * Delete a cookie that may have been chunked — clears the base cookie name
 * and every numbered chunk present in `store`.
 */
export function deleteChunkedCookie(store: ChunkedCookieWriter, name: string, options: ChunkedCookieOptions): void {
  const existing: string[] = CookieChunking.filterChunkNames(
    name,
    store.getAll().map((cookie: {name: string}) => cookie.name),
  );

  if (existing.length === 0) {
    store.delete(toCookieDeletion(name, options));
    return;
  }

  for (const existingName of existing) {
    store.delete(toCookieDeletion(existingName, options));
  }
}
