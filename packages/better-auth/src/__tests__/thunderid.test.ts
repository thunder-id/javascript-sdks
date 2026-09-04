// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {betterAuth} from 'better-auth';
import {genericOAuth} from 'better-auth/plugins';
import {describe, expect, it} from 'vitest';
import {thunderid} from '../thunderid';

describe('thunderid', () => {
  it('should return the correct GenericOAuthConfig', () => {
    const config = thunderid({
      clientId: 'thunderid-client-id',
      clientSecret: 'thunderid-client-secret',
      issuer: 'https://thunderid.example.com',
    });

    expect(config.providerId).toBe('thunderid');
    expect(config.accountIssuer).toBe('https://thunderid.example.com');
    expect(config.discoveryUrl).toBe('https://thunderid.example.com/.well-known/openid-configuration');
    expect(config.scopes).toEqual(['openid', 'profile', 'email']);
    expect(config.clientId).toBe('thunderid-client-id');
    expect(config.clientSecret).toBe('thunderid-client-secret');
    expect(config.getUserInfo).toBeUndefined();
  });

  it('should handle an issuer with a trailing slash', () => {
    const config = thunderid({
      clientId: 'thunderid-client-id',
      clientSecret: 'thunderid-client-secret',
      issuer: 'https://thunderid.example.com/',
    });

    expect(config.accountIssuer).toBe('https://thunderid.example.com');
    expect(config.discoveryUrl).toBe('https://thunderid.example.com/.well-known/openid-configuration');
  });

  it('should allow overriding scopes', () => {
    const config = thunderid({
      clientId: 'thunderid-client-id',
      clientSecret: 'thunderid-client-secret',
      issuer: 'https://thunderid.example.com',
      scopes: ['openid', 'profile'],
    });

    expect(config.scopes).toEqual(['openid', 'profile']);
  });

  it('should forward sign-up and PKCE options', () => {
    const config = thunderid({
      clientId: 'thunderid-client-id',
      clientSecret: 'thunderid-client-secret',
      issuer: 'https://thunderid.example.com',
      pkce: true,
      disableImplicitSignUp: true,
    });

    expect(config.pkce).toBe(true);
    expect(config.disableImplicitSignUp).toBe(true);
  });

  it('should forward token endpoint auth and logout options', () => {
    const config = thunderid({
      clientId: 'thunderid-client-id',
      clientSecret: 'thunderid-client-secret',
      issuer: 'https://thunderid.example.com',
      tokenEndpointAuth: {method: 'client_secret_post'},
      endSessionEndpoint: 'https://thunderid.example.com/logout',
      postLogoutRedirectURI: 'https://app.example.com/logged-out',
      disableProviderLogout: true,
    });

    expect(config.tokenEndpointAuth).toEqual({method: 'client_secret_post'});
    expect(config.endSessionEndpoint).toBe('https://thunderid.example.com/logout');
    expect(config.postLogoutRedirectURI).toBe('https://app.example.com/logged-out');
    expect(config.disableProviderLogout).toBe(true);
  });

  it('should register with the genericOAuth plugin', () => {
    const auth = betterAuth({
      baseURL: 'http://localhost:3000',
      plugins: [
        genericOAuth({
          config: [
            thunderid({
              clientId: 'thunderid-client-id',
              clientSecret: 'thunderid-client-secret',
              issuer: 'https://thunderid.example.com',
            }),
          ],
        }),
      ],
    });

    expect(auth).toBeDefined();
  });
});
