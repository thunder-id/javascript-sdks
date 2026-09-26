// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The kind of client an application represents.
 */
export type ApplicationType = 'browser' | 'fullstack' | 'mobile' | 'm2m' | 'mcp' | 'custom';

/**
 * Base token configuration shared by the tokens an application issues.
 */
export interface TokenConfig {
  /**
   * User attributes to include in the token.
   */
  userAttributes: string[];
  /**
   * Token validity period, in seconds.
   */
  validityPeriod: number;
}

/**
 * Configuration of the assertion issued for an application.
 */
export type AssertionConfig = TokenConfig;

/**
 * Access token settings for one kind of subject (a user or the client itself).
 */
export interface AccessTokenSubConfig {
  attributes?: string[];
  validityPeriod?: number;
}

/**
 * Access token configuration.
 */
export interface AccessTokenConfig {
  clientConfig?: AccessTokenSubConfig;
  defaultAudience?: string;
  userConfig?: AccessTokenSubConfig;
}

/**
 * OAuth 2.0 grant types an application can be configured with.
 */
export type OAuth2GrantType =
  | 'authorization_code'
  | 'refresh_token'
  | 'client_credentials'
  | 'password'
  | 'implicit'
  | 'urn:openid:params:grant-type:ciba'
  | 'urn:ietf:params:oauth:grant-type:token-exchange'
  | 'urn:ietf:params:oauth:grant-type:jwt-bearer';

/**
 * OAuth 2.0 grant type values.
 */
export const OAuth2GrantTypes = {
  AUTHORIZATION_CODE: 'authorization_code',
  CIBA: 'urn:openid:params:grant-type:ciba',
  CLIENT_CREDENTIALS: 'client_credentials',
  IMPLICIT: 'implicit',
  JWT_BEARER: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
  PASSWORD: 'password',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXCHANGE: 'urn:ietf:params:oauth:grant-type:token-exchange',
} as const;

/**
 * Grant types that can issue a refresh token.
 */
export const REFRESH_TOKEN_ISSUING_GRANTS: readonly string[] = [
  OAuth2GrantTypes.AUTHORIZATION_CODE,
  OAuth2GrantTypes.CIBA,
];

/**
 * OAuth 2.0 response types an application can be configured with.
 */
export type OAuth2ResponseType = 'code' | 'token' | 'id_token' | 'code token' | 'code id_token' | 'token id_token';

/**
 * OAuth 2.0 response type values.
 */
export const OAuth2ResponseTypes = {
  CODE: 'code',
  CODE_ID_TOKEN: 'code id_token',
  CODE_TOKEN: 'code token',
  ID_TOKEN: 'id_token',
  TOKEN: 'token',
  TOKEN_ID_TOKEN: 'token id_token',
} as const;

/**
 * Token endpoint authentication methods an application can be configured with.
 */
export const TokenEndpointAuthMethods = {
  CLIENT_SECRET_BASIC: 'client_secret_basic',
  CLIENT_SECRET_JWT: 'client_secret_jwt',
  CLIENT_SECRET_POST: 'client_secret_post',
  NONE: 'none',
  PRIVATE_KEY_JWT: 'private_key_jwt',
} as const;

/**
 * Claims released for each scope.
 */
export interface ScopeClaims {
  [key: string]: string[] | undefined;
  email?: string[];
  group?: string[];
  phone?: string[];
  profile?: string[];
}

/**
 * Format of the issued ID token.
 */
export type IDTokenResponseType = 'JWT' | 'JWE' | 'NESTED_JWT';

/**
 * ID token configuration.
 */
export interface IDTokenConfig extends TokenConfig {
  encryptionAlg?: string;
  encryptionEnc?: string;
  responseType?: IDTokenResponseType;
}

/**
 * Refresh token configuration.
 */
export interface RefreshTokenConfig {
  validityPeriod: number;
}

/**
 * Identity assertion JWT authorization grant (ID-JAG) configuration.
 */
export interface IDJAGConfig {
  allowedAudiences?: string[];
  enabled: boolean;
  validityPeriod?: number;
}

/**
 * Token settings of an OAuth 2.0 application.
 */
export interface OAuth2Token {
  accessToken: AccessTokenConfig;
  idJag?: IDJAGConfig;
  idToken: IDTokenConfig;
  refreshToken?: RefreshTokenConfig;
}

/**
 * Format of the userinfo response.
 */
export type UserInfoResponseType = 'JSON' | 'JWS' | 'JWE' | 'NESTED_JWT';

/**
 * Userinfo endpoint configuration.
 */
export interface UserInfoConfig {
  encryptionAlg?: string;
  encryptionEnc?: string;
  responseType?: UserInfoResponseType;
  signingAlg?: string;
  userAttributes: string[];
}

/**
 * OAuth 2.0 / OIDC configuration of an application.
 */
export interface OAuth2Config {
  acrValues?: string[];
  certificate?: {type: string; value?: string} | null;
  clientId?: string;
  clientSecret?: string;
  grantTypes: string[];
  pkceRequired?: boolean;
  postLogoutRedirectUris?: string[];
  publicClient?: boolean;
  redirectUris?: string[];
  requirePushedAuthorizationRequests?: boolean;
  responseTypes: string[];
  scopeClaims?: ScopeClaims;
  scopes?: string[];
  token?: OAuth2Token & Partial<TokenConfig>;
  tokenEndpointAuthMethod?: string;
  userInfo?: UserInfoConfig;
}

/**
 * Android app attestation configuration.
 */
export interface AndroidAttestationConfig {
  certificateSha256Digests?: string[];
  packageName?: string;
  serviceAccountCredentials?: string;
}

/**
 * Apple app attestation configuration.
 */
export interface AppleAttestationConfig {
  bundleId: string;
  teamId: string;
}

/**
 * App attestation configuration. At most one platform can be configured.
 */
export type AttestationConfig = {
  devMode?: boolean;
} & (
  | {android?: undefined; apple?: undefined}
  | {android: AndroidAttestationConfig; apple?: undefined}
  | {android?: undefined; apple: AppleAttestationConfig}
);

/**
 * Inbound authentication protocols an application can be configured with.
 */
export type InboundAuthType = 'oauth2';

/**
 * Inbound authentication protocol values.
 */
export const InboundAuthTypes = {
  OAUTH2: 'oauth2',
} as const;

/**
 * Inbound authentication configuration of an application.
 */
export interface InboundAuthConfig {
  config: OAuth2Config;
  type: string;
}

/**
 * An application registered in ThunderID.
 */
export interface Application {
  [key: string]: unknown;
  allowedAgentTypes?: string[];
  allowedUserTypes?: string[];
  assertion?: AssertionConfig;
  attestation?: AttestationConfig | null;
  authFlowId?: string;
  contacts?: string[];
  createdAt?: string;
  description?: string;
  flowSecret?: string;
  id: string;
  inboundAuthConfig?: InboundAuthConfig[];
  isReadOnly?: boolean;
  isRecoveryFlowEnabled?: boolean;
  isRegistrationFlowEnabled?: boolean;
  layoutId?: string;
  logoUrl?: string;
  name: string;
  ouId?: string;
  passkeyAllowedOrigins?: string[];
  policyUri?: string;
  recoveryFlowId?: string;
  registrationFlowId?: string;
  signOutFlowId?: string;
  template?: string;
  themeId?: string;
  tosUri?: string;
  type?: ApplicationType;
  updatedAt?: string;
  url?: string;
  userAttributes?: string[];
}

/**
 * The summary of an application returned in list responses.
 */
export type BasicApplication = Pick<
  Application,
  | 'id'
  | 'name'
  | 'description'
  | 'logoUrl'
  | 'authFlowId'
  | 'registrationFlowId'
  | 'isRegistrationFlowEnabled'
  | 'type'
  | 'template'
  | 'isReadOnly'
> & {
  clientId?: string;
};

/**
 * A page of applications.
 */
export interface ApplicationListResponse {
  applications: BasicApplication[];
  count: number;
  totalResults: number;
}

/**
 * The payload used to create or update an application. The server generates `id` and timestamps.
 */
export type CreateApplicationRequest = Omit<Application, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * The payload used to update an application.
 */
export type UpdateApplicationRequest = CreateApplicationRequest;
