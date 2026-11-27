// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CookieChunking} from '@thunderid/node';
import type {SessionCookieSameSite} from '@thunderid/node';
import {deleteCookie, getCookie, parseCookies, setCookie} from 'h3';
import type {H3Event} from 'h3';

interface ChunkedCookieOptions {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: SessionCookieSameSite;
  secure: boolean;
}

/**
 * Read a cookie that may have been split across `${name}.0`, `${name}.1`,
 * ... chunks, reassembling it into the original value. Falls back to the
 * unchunked `name` cookie when the value fit in a single cookie.
 */
export function getChunkedCookie(event: H3Event, name: string): string | undefined {
  return CookieChunking.join(name, (cookieName: string) => getCookie(event, cookieName));
}

/**
 * Write a cookie value, splitting it across numbered `${name}.0`,
 * `${name}.1`, ... chunks once it would exceed the ~4KB per-cookie limit
 * browsers enforce, and reassembling transparently via {@link getChunkedCookie}.
 *
 * Clears any cookie names the previous value needed but the new one doesn't
 * (e.g. a smaller re-issued session that now fits in fewer chunks, or in a
 * single unchunked cookie).
 */
export function setChunkedCookie(event: H3Event, name: string, value: string, options: ChunkedCookieOptions): void {
  const existing: string[] = CookieChunking.filterChunkNames(name, Object.keys(parseCookies(event)));
  const newChunks: Record<string, string> = CookieChunking.split(name, value);
  const newNames = new Set<string>(Object.keys(newChunks));

  for (const existingName of existing) {
    if (!newNames.has(existingName)) {
      deleteCookie(event, existingName, options);
    }
  }

  for (const [chunkCookieName, chunkValue] of Object.entries(newChunks)) {
    setCookie(event, chunkCookieName, chunkValue, options);
  }
}

/**
 * Delete a cookie that may have been chunked — clears the base cookie name
 * and every numbered chunk present in the current request.
 */
export function deleteChunkedCookie(event: H3Event, name: string, options: ChunkedCookieOptions): void {
  const existing: string[] = CookieChunking.filterChunkNames(name, Object.keys(parseCookies(event)));

  if (existing.length === 0) {
    deleteCookie(event, name, options);
    return;
  }

  for (const existingName of existing) {
    deleteCookie(event, existingName, options);
  }
}
