// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
import {describe, expect, it} from 'vitest';
import AuthenticationHelper from '../AuthenticationHelper';
import resolveBackendEndpoints from '../resolveBackendEndpoints';
import resolveRequestBaseUrl from '../resolveRequestBaseUrl';

const ORIGIN = 'https://app.example.com';

describe('resolveBackendEndpoints', () => {
  it('returns undefined when sign-in does not run on a backend', () => {
    expect(resolveBackendEndpoints({baseUrl: 'https://auth.example.com'}, ORIGIN)).toBeUndefined();
    expect(resolveBackendEndpoints(undefined, ORIGIN)).toBeUndefined();
  });

  it('defaults every unset endpoint under /api/auth', () => {
    expect(resolveBackendEndpoints({endpoints: {backend: {}}}, ORIGIN)).toEqual({
      bypass: {attachToken: true, urls: []},
      checkSession: '/api/auth/checksession',
      proxy: '/api/auth/proxy',
      refresh: '/api/auth/refresh',
      session: '/api/auth/session',
      signIn: '/api/auth/signin',
      signOut: '/api/auth/signout',
      token: '/api/auth/token',
    });
  });

  it('resolves endpoint paths, the proxy included, against baseUrl, the backend', () => {
    const resolved = resolveBackendEndpoints(
      {
        baseUrl: 'https://bff.example.com/',
        endpoints: {backend: {proxy: '/gateway/api/', session: '/gateway/me', signIn: '/gateway/signin'}},
      },
      ORIGIN,
    );

    expect(resolved?.signIn).toBe('https://bff.example.com/gateway/signin');
    expect(resolved?.session).toBe('https://bff.example.com/gateway/me');
    expect(resolved?.proxy).toBe('https://bff.example.com/gateway/api');
    expect(resolved?.signOut).toBe('https://bff.example.com/api/auth/signout');
  });

  it('uses absolute endpoint URLs as they are', () => {
    const resolved = resolveBackendEndpoints(
      {
        baseUrl: 'https://bff.example.com',
        endpoints: {backend: {checkSession: '//auth.example.com/check', session: 'https://auth.example.com/me'}},
      },
      ORIGIN,
    );

    expect(resolved?.session).toBe('https://auth.example.com/me');
    expect(resolved?.checkSession).toBe('//auth.example.com/check');
    expect(resolved?.refresh).toBe('https://bff.example.com/api/auth/refresh');
  });

  it('keeps endpoint paths relative to the app origin without baseUrl', () => {
    const resolved = resolveBackendEndpoints({baseUrl: '', endpoints: {backend: {session: '/gateway/me'}}}, ORIGIN);

    expect(resolved?.session).toBe('/gateway/me');
    expect(resolved?.proxy).toBe('/api/auth/proxy');
  });

  it('applies the token endpoint and the bypass, trimming its URLs', () => {
    const resolved = resolveBackendEndpoints(
      {
        endpoints: {
          backend: {bypass: {attachToken: false, urls: ['https://dp.example.com/api/']}, token: '/gateway/token'},
        },
      },
      ORIGIN,
    );

    expect(resolved?.token).toBe('/gateway/token');
    expect(resolved?.bypass).toEqual({attachToken: false, urls: ['https://dp.example.com/api']});
  });
});

describe('resolveRequestBaseUrl', () => {
  it("is the backend's proxy, resolved against baseUrl, in backend mode", () => {
    expect(
      resolveRequestBaseUrl({baseUrl: 'https://bff.example.com', endpoints: {backend: {proxy: '/gateway/api'}}}),
    ).toBe('https://bff.example.com/gateway/api');
    expect(resolveRequestBaseUrl({baseUrl: 'https://bff.example.com', endpoints: {backend: {}}})).toBe(
      'https://bff.example.com/api/auth/proxy',
    );
    expect(resolveRequestBaseUrl({endpoints: {backend: {proxy: '/gateway/api'}}})).toBe('/gateway/api');
    expect(
      resolveRequestBaseUrl({
        baseUrl: 'https://bff.example.com',
        endpoints: {backend: {proxy: 'https://api.example.com/p'}},
      }),
    ).toBe('https://api.example.com/p');
  });

  it('is baseUrl outside backend mode', () => {
    expect(resolveRequestBaseUrl({baseUrl: 'https://auth.example.com'})).toBe('https://auth.example.com');
    expect(resolveRequestBaseUrl(undefined)).toBeUndefined();
  });
});

describe('AuthenticationHelper OIDC endpoint overrides', () => {
  it('keeps the backend overrides out of the OIDC provider metadata', async () => {
    const storageManager = {
      getConfigData: async (): Promise<unknown> => ({
        endpoints: {backend: {session: '/x'}, token: 'https://auth.example.com/token'},
      }),
    };
    const helper = new AuthenticationHelper<any>(storageManager as any, {} as any);

    const resolved = await helper.resolveEndpoints({});

    expect(resolved.token).toBe('https://auth.example.com/token');
    expect(resolved).not.toHaveProperty('backend');
  });
});
