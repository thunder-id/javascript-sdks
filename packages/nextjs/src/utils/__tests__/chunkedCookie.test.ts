// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, it, expect} from 'vitest';
import {
  ChunkedCookieOptions,
  CookieDeletion,
  deleteChunkedCookie,
  getChunkedCookie,
  setChunkedCookie,
} from '../chunkedCookie';

const OPTIONS: ChunkedCookieOptions = {httpOnly: true, maxAge: 3600, path: '/', sameSite: 'lax', secure: false};

/** A minimal in-memory cookie jar satisfying the `ChunkedCookieWriter` shape. */
class FakeCookieJar {
  private readonly jar = new Map<string, string>();

  readonly deletions: CookieDeletion[] = [];

  delete(cookie: CookieDeletion): void {
    this.deletions.push(cookie);
    this.jar.delete(cookie.name);
  }

  get(name: string): {value: string} | undefined {
    const value: string | undefined = this.jar.get(name);
    return value === undefined ? undefined : {value};
  }

  getAll(): {name: string}[] {
    return Array.from(this.jar.keys()).map((name: string) => ({name}));
  }

  set(name: string, value: string): void {
    this.jar.set(name, value);
  }
}

describe('setChunkedCookie / getChunkedCookie', () => {
  it('writes and reads back a small value as a single unchunked cookie', () => {
    const jar = new FakeCookieJar();
    setChunkedCookie(jar, 'session', 'small-value', OPTIONS);

    expect(jar.getAll()).toEqual([{name: 'session'}]);
    expect(getChunkedCookie(jar, 'session')).toBe('small-value');
  });

  it('splits an oversized value across numbered chunk cookies and reassembles it', () => {
    const jar = new FakeCookieJar();
    const largeValue = 'x'.repeat(10_000);

    setChunkedCookie(jar, 'session', largeValue, OPTIONS);

    const names = jar.getAll().map((c) => c.name);
    expect(names.length).toBeGreaterThan(1);
    expect(names.every((name: string) => /^session\.\d+$/.test(name))).toBe(true);
    expect(getChunkedCookie(jar, 'session')).toBe(largeValue);
  });

  it('clears stale chunk cookies when a re-issued value shrinks back to one cookie', () => {
    const jar = new FakeCookieJar();
    setChunkedCookie(jar, 'session', 'x'.repeat(12_000), OPTIONS);
    expect(jar.getAll().length).toBeGreaterThan(1);

    setChunkedCookie(jar, 'session', 'small-value', OPTIONS);

    expect(jar.getAll()).toEqual([{name: 'session'}]);
    expect(getChunkedCookie(jar, 'session')).toBe('small-value');
  });

  it('clears the prior unchunked cookie when a re-issued value grows past the chunk threshold', () => {
    const jar = new FakeCookieJar();
    setChunkedCookie(jar, 'session', 'small-value', OPTIONS);
    expect(jar.getAll()).toEqual([{name: 'session'}]);

    const largeValue = 'y'.repeat(10_000);
    setChunkedCookie(jar, 'session', largeValue, OPTIONS);

    const names = jar.getAll().map((c) => c.name);
    expect(names).not.toContain('session');
    expect(names.length).toBeGreaterThan(1);
    expect(getChunkedCookie(jar, 'session')).toBe(largeValue);
  });

  it('returns undefined when no cookie is present', () => {
    const jar = new FakeCookieJar();
    expect(getChunkedCookie(jar, 'session')).toBeUndefined();
  });
});

describe('deleteChunkedCookie', () => {
  it('clears an unchunked cookie', () => {
    const jar = new FakeCookieJar();
    setChunkedCookie(jar, 'session', 'small-value', OPTIONS);

    deleteChunkedCookie(jar, 'session', OPTIONS);

    expect(jar.getAll()).toEqual([]);
  });

  it('clears every numbered chunk', () => {
    const jar = new FakeCookieJar();
    setChunkedCookie(jar, 'session', 'z'.repeat(12_000), OPTIONS);
    expect(jar.getAll().length).toBeGreaterThan(1);

    deleteChunkedCookie(jar, 'session', OPTIONS);

    expect(jar.getAll()).toEqual([]);
  });

  it('is a no-op-safe call when nothing is present', () => {
    const jar = new FakeCookieJar();
    expect(() => deleteChunkedCookie(jar, 'session', OPTIONS)).not.toThrow();
  });

  it('repeats the cookie attributes but not maxAge, so a __Host- cookie is really deleted', () => {
    const jar = new FakeCookieJar();
    const secure: ChunkedCookieOptions = {...OPTIONS, secure: true};

    setChunkedCookie(jar, '__Host-session', 'z'.repeat(12_000), secure);
    deleteChunkedCookie(jar, '__Host-session', secure);

    expect(jar.deletions.length).toBeGreaterThan(1);
    for (const deletion of jar.deletions) {
      expect(deletion).toEqual({httpOnly: true, name: deletion.name, path: '/', sameSite: 'lax', secure: true});
    }
  });
});
