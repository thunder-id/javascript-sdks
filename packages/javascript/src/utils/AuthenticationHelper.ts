// Copyright 2020-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import extractUserClaimsFromIdToken from './extractUserClaimsFromIdToken';
import processOpenIDScopes from './processOpenIDScopes';
import {RESOURCE_ENDPOINT_KEYS} from './resolveResourceEndpoint';
import validateLogoutTokenClaims from './validateLogoutTokenClaims';
import BackchannelLogoutConstants from '../constants/BackchannelLogoutConstants';
import OIDCDiscoveryConstants from '../constants/OIDCDiscoveryConstants';
import TokenConstants from '../constants/TokenConstants';
import TokenExchangeConstants from '../constants/TokenExchangeConstants';
import {InvalidLogoutTokenError, ThunderIDAuthException} from '../errors/exception';
import {IsomorphicCrypto} from '../IsomorphicCrypto';
import {AuthClientConfig} from '../models/config';
import {JWKInterface} from '../models/crypto';
import {LogoutTokenClaims} from '../models/logout-token';
import {OIDCDiscoveryEndpointsApiResponse, OIDCDiscoveryApiResponse} from '../models/oidc-discovery';
import {SessionData} from '../models/session';
import {IdToken, TokenResponse, AccessTokenApiResponse} from '../models/token';
import {User} from '../models/user';
import StorageManager from '../StorageManager';

/**
 * Provides core authentication helper utilities for token handling, endpoint resolution,
 * ID token validation, and session management.
 *
 * @typeParam T - Optional extension type for framework-specific config fields.
 */
class AuthenticationHelper<T> {
  private storageManager: StorageManager<T>;

  private config: () => Promise<AuthClientConfig<T>>;

  private oidcProviderMetaData: () => Promise<OIDCDiscoveryApiResponse>;

  private cryptoHelper: IsomorphicCrypto;

  private jwksCache: {fetchedAt: number; keys: JWKInterface[]} | undefined;

  // The fetch in flight, shared by every request that arrives while it runs, and when the last
  // one started, whether or not it succeeded. Together they bound the fetches a burst can cause.
  private jwksFetch: Promise<JWKInterface[]> | undefined;

  private jwksFetchStartedAt = 0;

  /**
   * Creates a new `AuthenticationHelper` instance.
   *
   * @param storageManagerInstance - The storage manager to use for reading config and session data.
   * @param cryptoHelperInstance - The isomorphic crypto helper for JWT operations.
   */
  public constructor(storageManagerInstance: StorageManager<T>, cryptoHelperInstance: IsomorphicCrypto) {
    this.storageManager = storageManagerInstance;
    this.config = async (): Promise<AuthClientConfig<T>> => this.storageManager.getConfigData();
    this.oidcProviderMetaData = async (): Promise<OIDCDiscoveryApiResponse> =>
      this.storageManager.loadOpenIDProviderConfiguration();
    this.cryptoHelper = cryptoHelperInstance;
  }

  /**
   * Maps the config-defined OIDC endpoint overrides to their discovery-metadata form.
   *
   * Endpoint names are converted from camelCase to snake_case, and resource-server endpoints
   * (`RESOURCE_ENDPOINT_KEYS`) and the backend overrides are excluded — those are resolved separately via
   * `resolveResourceEndpoint` and must not leak into the OIDC provider metadata.
   *
   * @param configData - The resolved auth client config.
   * @returns A snake_cased map of the OIDC endpoint overrides (empty when none are configured).
   */
  private mapConfiguredOidcEndpoints(configData: AuthClientConfig<T>): OIDCDiscoveryApiResponse {
    const endpoints: OIDCDiscoveryApiResponse = {};

    if (!configData.endpoints) {
      return endpoints;
    }

    Object.keys(configData.endpoints)
      .filter(
        (endpointName: string) => endpointName !== 'backend' && !RESOURCE_ENDPOINT_KEYS.includes(endpointName as never),
      )
      .forEach((endpointName: string) => {
        const snakeCasedName: string = endpointName.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);

        endpoints[snakeCasedName] = configData.endpoints ? configData.endpoints[endpointName] : '';
      });

    return endpoints;
  }

  /**
   * Merges explicit endpoint overrides from config into the discovery response.
   * Config-defined endpoint names (camelCase) are converted to snake_case before merging.
   *
   * @param response - The raw OIDC discovery response from the well-known endpoint.
   * @returns The discovery response with any config-specified endpoint overrides applied.
   */
  public async resolveEndpoints(response: OIDCDiscoveryApiResponse): Promise<OIDCDiscoveryApiResponse> {
    const configData: AuthClientConfig<T> = await this.config();

    return {...response, ...this.mapConfiguredOidcEndpoints(configData)};
  }

  /**
   * Builds an OIDC endpoint map from explicitly configured endpoint URLs.
   * Throws if required endpoints are missing.
   *
   * @returns A partial OIDC discovery response containing all explicitly configured endpoints.
   * @throws {ThunderIDAuthException} When required endpoints are absent from the config.
   */
  public async resolveEndpointsExplicitly(): Promise<OIDCDiscoveryEndpointsApiResponse> {
    const configData: AuthClientConfig<T> = await this.config();

    const requiredEndpoints: string[] = [
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.AUTHORIZATION,
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.END_SESSION,
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.JWKS,
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.SESSION_IFRAME,
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.REVOCATION,
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.TOKEN,
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.ISSUER,
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.USERINFO,
    ];

    const isRequiredEndpointsContains: boolean = configData.endpoints
      ? requiredEndpoints.every((reqEndpointName: string) =>
          configData.endpoints
            ? Object.keys(configData.endpoints).some((endpointName: string) => {
                const snakeCasedName: string = endpointName.replace(
                  /[A-Z]/g,
                  (letter: string) => `_${letter.toLowerCase()}`,
                );

                return snakeCasedName === reqEndpointName;
              })
            : false,
        )
      : false;

    if (!isRequiredEndpointsContains) {
      throw new ThunderIDAuthException(
        'JS-AUTH_HELPER-REE-NF01',
        'Required endpoints missing',
        'Some or all of the required endpoints are missing in the object passed to the `endpoints` ' +
          'attribute of the`AuthConfig` object.',
      );
    }

    return {...this.mapConfiguredOidcEndpoints(configData)};
  }

  /**
   * Derives OIDC endpoint URLs from the configured `baseUrl`.
   * Any explicitly configured endpoints take precedence over the derived defaults.
   * The issuer is set to `baseUrl` per RFC 8414.
   *
   * @returns A partial OIDC discovery response with derived endpoint URLs.
   * @throws {ThunderIDAuthException} When `baseUrl` is not defined in the config.
   */
  public async resolveEndpointsByBaseURL(): Promise<OIDCDiscoveryEndpointsApiResponse> {
    const configData: AuthClientConfig<T> = await this.config();

    const {baseUrl} = configData as any;

    if (!baseUrl) {
      throw new ThunderIDAuthException(
        'JS-AUTH_HELPER_REBO-NF01',
        'Base URL not defined.',
        'Base URL is not defined in AuthClient config.',
      );
    }

    const oidcProviderMetaData: OIDCDiscoveryApiResponse = this.mapConfiguredOidcEndpoints(configData);

    const endpointKeys: typeof OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints =
      OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints;
    const endpointPaths: typeof OIDCDiscoveryConstants.Endpoints = OIDCDiscoveryConstants.Endpoints;

    // Issuer is the base URL per RFC 8414 (Section 2 & 3).
    // Reference: https://datatracker.ietf.org/doc/html/rfc8414#section-2
    const defaultEndpoints: OIDCDiscoveryApiResponse = {
      [endpointKeys.AUTHORIZATION]: `${baseUrl}${endpointPaths.AUTHORIZATION}`,
      [endpointKeys.END_SESSION]: `${baseUrl}${endpointPaths.END_SESSION}`,
      [endpointKeys.ISSUER]: `${baseUrl}`,
      [endpointKeys.JWKS]: `${baseUrl}${endpointPaths.JWKS}`,
      [endpointKeys.SESSION_IFRAME]: `${baseUrl}${endpointPaths.SESSION_IFRAME}`,
      [endpointKeys.REVOCATION]: `${baseUrl}${endpointPaths.REVOCATION}`,
      [endpointKeys.TOKEN]: `${baseUrl}${endpointPaths.TOKEN}`,
      [endpointKeys.USERINFO]: `${baseUrl}${endpointPaths.USERINFO}`,
    };

    return {...defaultEndpoints, ...oidcProviderMetaData};
  }

  /**
   * Validates an ID token using the JWKS endpoint and the configured validation options.
   *
   * @param idToken - The raw ID token string to validate.
   * @returns `true` if the token is valid.
   * @throws {ThunderIDAuthException} When the JWKS endpoint is missing or the request fails.
   */
  public async validateIdToken(idToken: string): Promise<boolean> {
    const keys: JWKInterface[] = await this.fetchJwks();
    const {issuer} = await this.oidcProviderMetaData();

    const jwk: any = await this.cryptoHelper.getJWKForTheIdToken(idToken.split('.')[0], keys);

    return this.cryptoHelper.isValidIdToken(
      idToken,
      jwk,
      (await this.config()).clientId ?? '',
      issuer ?? '',
      this.cryptoHelper.decodeJwtToken<IdToken>(idToken).sub,
      (await this.config()).tokenValidation?.idToken?.clockTolerance,
      (await this.config()).tokenValidation?.idToken?.validateIssuer ?? true,
    );
  }

  /**
   * Validates a back-channel logout token: its type, event, issuer, audience and lifetime, then its
   * signature against the server's keys. The claims are checked first, so a malformed token costs
   * neither a key fetch nor a signature check.
   *
   * @param logoutToken - The raw `logout_token` the server posted.
   * @returns The token's claims.
   * @throws {InvalidLogoutTokenError} When the token is not valid.
   */
  public async validateLogoutToken(logoutToken: string): Promise<LogoutTokenClaims> {
    const malformed: InvalidLogoutTokenError = new InvalidLogoutTokenError(
      'JS-AUTH_HELPER-VLT-IV01',
      'The logout token is not a signed JWT.',
    );

    if (typeof logoutToken !== 'string' || logoutToken.split('.').length !== 3) {
      throw malformed;
    }

    const configData: AuthClientConfig<T> = await this.config();
    const {issuer} = await this.oidcProviderMetaData();
    const clockTolerance: number =
      configData.tokenValidation?.idToken?.clockTolerance ?? BackchannelLogoutConstants.DEFAULT_CLOCK_TOLERANCE_SECONDS;
    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;

    try {
      header = this.cryptoHelper.decodeJwtHeader(logoutToken);
      payload = this.cryptoHelper.decodeJwtToken(logoutToken);
    } catch {
      throw malformed;
    }

    const claims: LogoutTokenClaims = validateLogoutTokenClaims(header, payload, {
      clientId: configData.clientId ?? '',
      clockTolerance,
      issuer: issuer ?? '',
      supportedAlgorithms: TokenConstants.SignatureValidation.SUPPORTED_ALGORITHMS,
    });

    await this.cryptoHelper.verifyLogoutTokenSignature(
      logoutToken,
      await this.getCachedJwk(header['kid']),
      configData.clientId ?? '',
      issuer ?? '',
      claims.sub,
      clockTolerance,
    );

    return claims;
  }

  /**
   * Returns the server key with the given identifier from a cached key set. An unknown identifier
   * triggers one re-fetch, to follow key rotation, no more often than the minimum interval: the
   * logout endpoint is unauthenticated, so an unbounded re-fetch would let anyone drive requests
   * to the server. Requests that arrive while a fetch runs share it.
   */
  private async getCachedJwk(kid: unknown): Promise<JWKInterface> {
    const now: number = Date.now();
    const find = (keys: JWKInterface[]): JWKInterface | undefined =>
      keys.find((key: JWKInterface): boolean => key.kid === kid);
    const fresh: boolean =
      this.jwksCache !== undefined && now - this.jwksCache.fetchedAt < BackchannelLogoutConstants.JWKS_CACHE_TTL_MS;

    let jwk: JWKInterface | undefined = fresh ? find(this.jwksCache!.keys) : undefined;

    if (
      !jwk &&
      (this.jwksFetch || now - this.jwksFetchStartedAt >= BackchannelLogoutConstants.JWKS_MIN_REFETCH_INTERVAL_MS)
    ) {
      jwk = find(await this.fetchJwksOnce());
    } else if (!jwk && !fresh) {
      // The last fetch failed a moment ago. A 5xx lets the server try again; a 400 would not.
      throw new ThunderIDAuthException(
        'JS-AUTH_HELPER-GCJ-NA02',
        'The server keys are not available.',
        'The server key set could not be fetched recently, and the cached one has expired.',
      );
    }

    if (!jwk) {
      throw new InvalidLogoutTokenError(
        'JS-AUTH_HELPER-GCJ-NF01',
        'The logout token names a key the server does not publish.',
      );
    }

    return jwk;
  }

  /**
   * Fetches the key set unless a fetch is already running, in which case that one is shared.
   */
  private fetchJwksOnce(): Promise<JWKInterface[]> {
    if (!this.jwksFetch) {
      this.jwksFetchStartedAt = Date.now();
      this.jwksFetch = this.fetchJwks()
        .then((keys: JWKInterface[]): JWKInterface[] => {
          this.jwksCache = {fetchedAt: Date.now(), keys};

          return keys;
        })
        .finally((): void => {
          this.jwksFetch = undefined;
        });
    }

    return this.jwksFetch;
  }

  /**
   * Fetches the server's JSON Web Key Set.
   *
   * @throws {ThunderIDAuthException} When the JWKS endpoint is missing or the request fails.
   */
  private async fetchJwks(): Promise<JWKInterface[]> {
    const jwksEndpoint: string | undefined = (await this.storageManager.loadOpenIDProviderConfiguration()).jwks_uri;
    const configData: AuthClientConfig<T> = await this.config();

    if (!jwksEndpoint || jwksEndpoint.trim().length === 0) {
      throw new ThunderIDAuthException(
        'JS_AUTH_HELPER-VIT-NF01',
        'JWKS endpoint not found.',
        'No JWKS endpoint was found in the OIDC provider meta data returned by the well-known endpoint ' +
          'or the JWKS endpoint passed to the SDK is empty.',
      );
    }

    let response: Response;

    try {
      response = await fetch(jwksEndpoint, {
        credentials: configData.sendCookiesInRequests ? 'include' : 'same-origin',
      });
    } catch (error: any) {
      throw new ThunderIDAuthException(
        'JS-AUTH_HELPER-VIT-NE02',
        'Request to jwks endpoint failed.',
        error ?? 'The request sent to get the jwks from the server failed.',
      );
    }

    if (response.status !== 200 || !response.ok) {
      throw new ThunderIDAuthException(
        'JS-AUTH_HELPER-VIT-HE03',
        `Invalid response status received for jwks request (${response.statusText}).`,
        (await response.json()) as string,
      );
    }

    const {keys}: {keys: JWKInterface[]} = (await response.json()) as {
      keys: JWKInterface[];
    };

    return keys;
  }

  /**
   * Extracts user information from a decoded ID token payload.
   *
   * @param idToken - The raw ID token string.
   * @returns A `User` object built from the ID token claims.
   */
  public getAuthenticatedUserInfo(idToken: string): User {
    const payload: IdToken = this.cryptoHelper.decodeJwtToken<IdToken>(idToken);
    const username: string = payload?.['username'] ?? '';
    const givenName: string = payload?.['given_name'] ?? '';
    const familyName: string = payload?.['family_name'] ?? '';
    const fullName: string = givenName && familyName ? `${givenName} ${familyName}` : givenName || familyName || '';
    const displayName: string = payload.preferred_username ?? fullName;

    return {
      displayName,
      username,
      ...extractUserClaimsFromIdToken(payload),
    };
  }

  /**
   * Replaces template placeholders in a custom grant string with real session values.
   *
   * @param text - The template string containing placeholders.
   * @param userId - Optional user ID scoping the session lookup.
   * @returns The string with all placeholders replaced.
   * @throws {ThunderIDAuthException} When session data for the source instance cannot be found.
   */
  public async replaceCustomGrantTemplateTags(text: string, userId?: string): Promise<string> {
    const configData: AuthClientConfig<T> = await this.config();

    const sourceInstanceId: number | null = configData.organizationChain?.sourceInstanceId ?? null;

    let sessionData: SessionData;

    if (sourceInstanceId) {
      const {clientId} = configData;
      let instanceKey: string;
      if (clientId) {
        instanceKey = `instance_${sourceInstanceId}-${clientId}`;
      } else {
        instanceKey = `instance_${sourceInstanceId}`;
      }
      sessionData = await this.storageManager.getSessionData(userId, instanceKey);

      if (!sessionData?.access_token) {
        throw new ThunderIDAuthException(
          'JS-AUTH_HELPER-RCGTT-NE01',
          'No session data found for source instance.',
          'Failed to retrieve session data from the source organization context.',
        );
      }
    } else {
      sessionData = await this.storageManager.getSessionData(userId);
    }

    const scope: string = processOpenIDScopes(configData.scopes);

    if (typeof text !== 'string') {
      return text;
    }

    return text
      .replace(TokenExchangeConstants.Placeholders.ACCESS_TOKEN, sessionData.access_token)
      .replace(
        TokenExchangeConstants.Placeholders.USERNAME,
        this.getAuthenticatedUserInfo(sessionData.id_token).username ?? '',
      )
      .replace(TokenExchangeConstants.Placeholders.SCOPES, scope)
      .replace(TokenExchangeConstants.Placeholders.CLIENT_ID, configData.clientId ?? '')
      .replace(TokenExchangeConstants.Placeholders.CLIENT_SECRET, configData.clientSecret ?? '');
  }

  /**
   * Clears all temporary and session data for the given user.
   *
   * @param userId - Optional user ID scoping the session to clear.
   */
  public async clearSession(userId?: string): Promise<void> {
    await this.storageManager.removeTemporaryData(userId);
    await this.storageManager.removeSessionData(userId);
  }

  /**
   * Parses a token endpoint response, optionally validates the ID token,
   * persists the session, and returns a normalized `TokenResponse`.
   *
   * @param response - The raw HTTP response from the token endpoint.
   * @param userId - Optional user ID scoping the session.
   * @returns A normalized `TokenResponse` object.
   * @throws {ThunderIDAuthException} When the response status is not 200.
   */
  public async handleTokenResponse(response: Response, userId?: string): Promise<TokenResponse> {
    if (response.status !== 200 || !response.ok) {
      throw new ThunderIDAuthException(
        'JS-AUTH_HELPER-HTR-NE01',
        `Invalid response status received for token request (${response.statusText}).`,
        (await response.json()) as string,
      );
    }

    const parsedResponse: AccessTokenApiResponse = (await response.json()) as AccessTokenApiResponse;

    parsedResponse.created_at = new Date().getTime();

    const shouldValidateIdToken: boolean | undefined = (await this.config()).tokenValidation?.idToken?.validate;

    if (shouldValidateIdToken) {
      return this.validateIdToken(parsedResponse.id_token).then(async () => {
        await this.storageManager.setSessionData(parsedResponse, userId);

        return {
          accessToken: parsedResponse.access_token,
          createdAt: parsedResponse.created_at,
          expiresIn: parsedResponse.expires_in,
          idToken: parsedResponse.id_token,
          refreshToken: parsedResponse.refresh_token,
          scope: parsedResponse.scope,
          tokenType: parsedResponse.token_type,
        };
      });
    }

    await this.storageManager.setSessionData(parsedResponse, userId);

    return {
      accessToken: parsedResponse.access_token,
      createdAt: parsedResponse.created_at,
      expiresIn: parsedResponse.expires_in,
      idToken: parsedResponse.id_token,
      refreshToken: parsedResponse.refresh_token,
      scope: parsedResponse.scope,
      tokenType: parsedResponse.token_type,
    };
  }
}

export default AuthenticationHelper;
