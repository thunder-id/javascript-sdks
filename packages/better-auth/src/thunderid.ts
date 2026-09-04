// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {BaseOAuthProviderOptions, GenericOAuthConfig} from 'better-auth/plugins/generic-oauth';

/**
 * Options accepted by the {@link thunderid} provider helper.
 */
export interface ThunderIDOptions extends BaseOAuthProviderOptions {
  /**
   * ThunderID issuer URL (e.g. `https://thunderid.example.com`).
   *
   * The OpenID Connect discovery URL is derived from this value, so every other
   * endpoint (authorization, token, userinfo, JWKS, end session) is resolved
   * from the issuer's discovery document rather than hardcoded here.
   */
  issuer: string;
}

const DEFAULT_SCOPES: string[] = ['openid', 'profile', 'email'];

/**
 * ThunderID provider helper for the Better Auth Generic OAuth plugin.
 *
 * Returns a typed `GenericOAuthConfig` for a ThunderID issuer, defaulting to the
 * `openid profile email` scopes. All OAuth 2.0 / OIDC handling is performed by
 * Better Auth itself — this helper only supplies configuration.
 *
 * @example
 * ```ts
 * import {thunderid} from '@thunderid/better-auth';
 * import {betterAuth} from 'better-auth';
 * import {genericOAuth} from 'better-auth/plugins';
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     genericOAuth({
 *       config: [
 *         thunderid({
 *           clientId: process.env.THUNDERID_CLIENT_ID!,
 *           clientSecret: process.env.THUNDERID_CLIENT_SECRET!,
 *           issuer: process.env.THUNDERID_ISSUER!,
 *         }),
 *       ],
 *     }),
 *   ],
 * });
 * ```
 *
 * The callback URL to register with ThunderID is
 * `{baseURL}/api/auth/callback/thunderid`.
 */
export function thunderid(options: ThunderIDOptions): GenericOAuthConfig<'thunderid'> {
  // A trailing slash would yield a double slash in the derived discovery URL and
  // break issuer comparison against the `iss` claim, which is never slash-suffixed.
  const issuer: string = options.issuer.replace(/\/$/, '');

  return {
    providerId: 'thunderid',
    accountIssuer: issuer,
    discoveryUrl: `${issuer}/.well-known/openid-configuration`,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    tokenEndpointAuth: options.tokenEndpointAuth,
    scopes: options.scopes ?? DEFAULT_SCOPES,
    redirectURI: options.redirectURI,
    endSessionEndpoint: options.endSessionEndpoint,
    postLogoutRedirectURI: options.postLogoutRedirectURI,
    disableProviderLogout: options.disableProviderLogout,
    pkce: options.pkce,
    disableImplicitSignUp: options.disableImplicitSignUp,
    disableSignUp: options.disableSignUp,
    overrideUserInfo: options.overrideUserInfo,
  };
}
