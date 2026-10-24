// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
import {describe, expect, it} from 'vitest';
import AuthenticationHelper from '../AuthenticationHelper';
import resolveBackendEndpoints from '../resolveBackendEndpoints';

const ORIGIN = 'https://app.example.com';

describe('resolveBackendEndpoints', () => {
  it('returns undefined when sign-in does not run on a backend', () => {
    expect(resolveBackendEndpoints({baseUrl: 'https://auth.example.com'}, ORIGIN)).toBeUndefined();
    expect(resolveBackendEndpoints(undefined, ORIGIN)).toBeUndefined();
  });

  it('defaults every unset endpoint under /api/auth and the API base to the app origin', () => {
    expect(resolveBackendEndpoints({endpoints: {backend: {}}}, ORIGIN)).toEqual({
      apiBaseUrl: ORIGIN,
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

  it('applies the configured endpoints and uses baseUrl as the API base', () => {
    const resolved = resolveBackendEndpoints(
      {
        baseUrl: 'https://auth.example.com/',
        endpoints: {backend: {proxy: '/gateway/api/', session: '/gateway/me', signIn: '/gateway/signin'}},
      },
      ORIGIN,
    );

    expect(resolved?.signIn).toBe('/gateway/signin');
    expect(resolved?.session).toBe('/gateway/me');
    expect(resolved?.proxy).toBe('/gateway/api');
    expect(resolved?.signOut).toBe('/api/auth/signout');
    expect(resolved?.apiBaseUrl).toBe('https://auth.example.com');
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
