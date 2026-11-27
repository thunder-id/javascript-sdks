// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import {bffSignedIn, renderSignInContinuePage} from '../bff/handleBffRequest';
import resolveSessionCookieSameSite from '../utils/resolveSessionCookieSameSite';

describe('resolveSessionCookieSameSite', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('is Strict by default, as RFC 10017 recommends', () => {
    expect(resolveSessionCookieSameSite()).toBe('strict');
  });

  it('takes the configured value, then THUNDERID_SESSION_COOKIE_SAME_SITE', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('THUNDERID_SESSION_COOKIE_SAME_SITE', 'LAX');

    expect(resolveSessionCookieSameSite()).toBe('lax');
    expect(resolveSessionCookieSameSite('strict')).toBe('strict');
  });

  it('ignores a value it does not know', () => {
    vi.stubEnv('THUNDERID_SESSION_COOKIE_SAME_SITE', 'loose');

    expect(resolveSessionCookieSameSite()).toBe('strict');
  });
});

describe('the end of the callback', () => {
  it('moves on from a page when the session cookie is Strict', async () => {
    const response: Response = bffSignedIn('/orders', 'strict');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('<meta http-equiv="refresh" content="0;url=/orders">');
  });

  it('redirects when the session cookie is Lax', () => {
    const response: Response = bffSignedIn('/orders', 'lax');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/orders');
  });

  it('escapes the place to go, so it cannot break out of the attribute', () => {
    const page: string = renderSignInContinuePage('/a"><script>alert(1)</script>');

    expect(page).not.toContain('<script>');
    expect(page).toContain('/a&#34;&#62;&#60;script&#62;');
  });
});
