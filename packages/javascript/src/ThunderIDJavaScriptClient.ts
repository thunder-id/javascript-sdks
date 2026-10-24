// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import OIDCDiscoveryConstants from './constants/OIDCDiscoveryConstants';
import OIDCRequestConstants from './constants/OIDCRequestConstants';
import PKCEConstants from './constants/PKCEConstants';
import TokenConstants from './constants/TokenConstants';
import VendorConstants from './constants/VendorConstants';
import {DefaultCacheStore} from './DefaultCacheStore';
import {DefaultCrypto} from './DefaultCrypto';
import {ThunderIDAuthException} from './errors/exception';
import ThunderIDAPIError from './errors/ThunderIDAPIError';
import ThunderIDRuntimeError from './errors/ThunderIDRuntimeError';
import {IsomorphicCrypto} from './IsomorphicCrypto';
import {AgentConfig} from './models/agent';
import {AuthCodeResponse} from './models/auth-code-response';
import type {CIBAInitiateOptions, CIBAInitiateResponse, CIBAPollOptions} from './models/ciba';
import {ThunderIDClient} from './models/client';
import {AuthClientConfig, Config, SignInOptions, SignOutOptions, SignUpOptions} from './models/config';
import {Crypto} from './models/crypto';
import {ExtendedAuthorizeRequestUrlParams} from './models/oauth-request';
import {OIDCDiscoveryApiResponse} from './models/oidc-discovery';
import {OIDCEndpoints} from './models/oidc-endpoints';
import {LogoutTokenClaims} from './models/logout-token';
import {SessionData, UserSession} from './models/session';
import {Storage, TemporaryStore} from './models/store';
import {AccessTokenApiResponse, IdToken, TokenExchangeRequestConfig, TokenResponse} from './models/token';
import {User, UserProfile} from './models/user';
import StorageManager from './StorageManager';
import AuthenticationHelper from './utils/AuthenticationHelper';
import base64Encode from './utils/base64Encode';
import deepMerge from './utils/deepMerge';
import extractPkceStorageKeyFromState from './utils/extractPkceStorageKeyFromState';
import generatePkceStorageKey from './utils/generatePkceStorageKey';
import getAuthorizeRequestUrlParams from './utils/getAuthorizeRequestUrlParams';
import getOAuthErrorMessage from './utils/getOAuthErrorMessage';
import logger from './utils/logger';
import processOpenIDScopes from './utils/processOpenIDScopes';

const WELL_KNOWN_PATH = '/.well-known/openid-configuration';

/**
 * The issuer a discovery document must name: the configured `endpoints.issuer`, else the URL the
 * well-known path was appended to (OpenID Connect Discovery 1.0, section 4.3).
 */
const getExpectedIssuer = (
  configuredIssuer: string | undefined,
  wellKnownOverride: string | undefined,
  baseUrl: string | undefined,
): string | undefined => {
  if (configuredIssuer) {
    return configuredIssuer;
  }

  if (wellKnownOverride) {
    return wellKnownOverride.endsWith(WELL_KNOWN_PATH)
      ? wellKnownOverride.slice(0, -WELL_KNOWN_PATH.length)
      : undefined;
  }

  return baseUrl || undefined;
};

/**
 * Compares two issuers exactly, apart from a trailing slash on either side.
 */
const issuersMatch = (discovered: unknown, expected: string): boolean =>
  typeof discovered === 'string' && discovered.replace(/\/+$/, '') === expected.replace(/\/+$/, '');

/**
 * Reads a readable message from the body of a failed token, revocation, or custom grant response.
 */
const readErrorMessage = async (response: Response, fallback: string): Promise<string> =>
  getOAuthErrorMessage(await response.json().catch((): undefined => undefined), fallback);

/**
 * The storage key of the `state` sent with the authorization request whose PKCE key is given. Both
 * share the request index, so the callback finds the state from the index at the end of `state`.
 */
const getStateStorageKey = (pkceKey: string): string =>
  pkceKey.replace(
    PKCEConstants.Storage.StorageKeys.CODE_VERIFIER,
    OIDCRequestConstants.SignIn.Storage.StorageKeys.STATE,
  );

const REVOKE_ACCESS_TOKEN_REQUEST_TIMEOUT_MS = 10_000;

const DEFAULT_CONFIG: Partial<AuthClientConfig<unknown>> = {
  enablePKCE: true,
  responseMode: 'query',
  sendCookiesInRequests: true,
  tokenValidation: {
    idToken: {
      clockTolerance: 300,
      validate: true,
      validateIssuer: true,
    },
  },
};

class ThunderIDJavaScriptClient<T = Config> implements ThunderIDClient<T> {
  protected storageManager!: StorageManager<T>;

  protected cryptoUtils: Crypto;

  private configProvider!: () => Promise<AuthClientConfig<T>>;

  private oidcProviderMetaDataProvider!: () => Promise<OIDCDiscoveryApiResponse>;

  private authHelper!: AuthenticationHelper<T>;

  private cryptoHelper!: IsomorphicCrypto;

  private instanceIdValue = 0;

  private cacheStore: Storage;

  private baseURL = '';

  constructor(storage?: Storage, cryptoUtils?: Crypto) {
    this.cacheStore = storage ?? new DefaultCacheStore();
    this.cryptoUtils = cryptoUtils ?? new DefaultCrypto();
  }

  // ─── ThunderIDClient interface ───────────────────────────────────────────────

  public async initialize(config: T, storage?: Storage): Promise<boolean> {
    const store = storage ?? this.cacheStore;
    const fullConfig = config as unknown as AuthClientConfig<T>;
    const {clientId, instanceId} = fullConfig as any;

    if (instanceId !== undefined) {
      this.instanceIdValue = instanceId;
    }

    const storageKey = clientId ? `instance_${this.instanceIdValue}-${clientId}` : `instance_${this.instanceIdValue}`;
    const vendor = (fullConfig as any).vendor ?? VendorConstants.VENDOR_PREFIX;

    this.storageManager = new StorageManager<T>(storageKey, store, vendor);
    this.cryptoHelper = new IsomorphicCrypto(this.cryptoUtils);
    this.authHelper = new AuthenticationHelper(this.storageManager, this.cryptoHelper);
    this.configProvider = async (): Promise<AuthClientConfig<T>> => this.storageManager.getConfigData();
    this.oidcProviderMetaDataProvider = async (): Promise<OIDCDiscoveryApiResponse> =>
      this.storageManager.loadOpenIDProviderConfiguration();

    const {applicationId, endpoints} = fullConfig as any;
    let resolvedApplicationId: string | undefined = applicationId;

    if (applicationId) {
      await this.storageManager.setPersistedData({applicationId});
    } else {
      const persistedData: TemporaryStore = await this.storageManager.getPersistedData();
      if (persistedData?.['applicationId']) {
        resolvedApplicationId = persistedData['applicationId'] as string;
      }
    }

    const resolvedEndpoints = endpoints ? {...endpoints} : {};

    await this.storageManager.setConfigData(
      deepMerge({} as Record<string, any>, DEFAULT_CONFIG, fullConfig as Record<string, any>, {
        applicationId: resolvedApplicationId,
        endpoints: resolvedEndpoints,
        scope: processOpenIDScopes((fullConfig as any).scopes),
      }) as any,
    );

    this.baseURL = (fullConfig as any).baseUrl ?? '';

    return true;
  }

  public async reInitialize(config: Partial<T>): Promise<boolean> {
    const currentConfig = (await this.storageManager.getConfigData()) as unknown as AuthClientConfig<T>;
    const newConfig = deepMerge(currentConfig, config);

    await this.storageManager.setConfigData(newConfig);
    await this.loadOpenIDProviderConfiguration(true);

    return true;
  }

  public async getConfiguration(): Promise<T> {
    return (await this.storageManager.getConfigData()) as unknown as T;
  }

  /**
   * Returns the signed-in user, read from the claims of the session's ID token.
   *
   * @param userId - The session to read, on a server.
   * @throws {ThunderIDRuntimeError} With code `JS-AUTH_CORE-GU-NF01` when the session holds no ID token.
   */
  public async getUser(userId?: string): Promise<User> {
    const sessionData: SessionData = await this.storageManager.getSessionData(userId);

    if (!sessionData?.id_token) {
      throw new ThunderIDRuntimeError('No signed-in session was found.', 'JS-AUTH_CORE-GU-NF01', 'javascript');
    }

    const authenticatedUser: User = this.authHelper.getAuthenticatedUserInfo(sessionData.id_token);

    Object.keys(authenticatedUser).forEach((key: string) => {
      if (authenticatedUser[key] === undefined || authenticatedUser[key] === '' || authenticatedUser[key] === null) {
        delete authenticatedUser[key];
      }
    });

    return authenticatedUser;
  }

  public async isSignedIn(userId?: string): Promise<boolean> {
    const hasToken = Boolean(await this.getAccessToken(userId));

    if (!hasToken) {
      return false;
    }

    const sessionData = await this.storageManager.getSessionData(userId);
    const createdAt: number = sessionData?.created_at;
    const expiresInString: string = sessionData?.expires_in;

    if (!expiresInString) {
      return false;
    }

    const expiresIn: number = parseInt(expiresInString, 10) * 1000;

    return createdAt + expiresIn > new Date().getTime();
  }

  public async getAccessToken(sessionId?: string): Promise<string> {
    const configData = await this.configProvider();

    if (configData.grantType === 'client_credentials') {
      const sessionData = await this.storageManager.getSessionData(sessionId);

      if (sessionData?.access_token && this.isCachedTokenStillValid(sessionData)) {
        return sessionData.access_token;
      }

      const tokenResponse = await this.requestClientCredentialsToken(sessionId);

      return tokenResponse.accessToken;
    }

    return (await this.storageManager.getSessionData(sessionId))?.access_token;
  }

  private isCachedTokenStillValid(sessionData: SessionData): boolean {
    if (!sessionData.created_at || !sessionData.expires_in) {
      return false;
    }

    const expiresInMs = parseInt(sessionData.expires_in, 10) * 1000;

    return (
      sessionData.created_at + expiresInMs - TokenConstants.Lifecycle.CLIENT_CREDENTIALS_REFRESH_MARGIN_MS > Date.now()
    );
  }

  public clearSession(sessionId?: string): void {
    this.authHelper.clearSession(sessionId);
  }

  /**
   * Async variant of {@link clearSession} that resolves once the session data has been removed from
   * storage. Await this when the clear must complete before proceeding (for example, before a
   * full-page sign-out redirect); {@link clearSession} remains a fire-and-forget convenience.
   */
  protected clearSessionAsync(sessionId?: string): Promise<void> {
    return this.authHelper.clearSession(sessionId);
  }

  public async setSession(sessionData: Record<string, unknown>, sessionId?: string): Promise<void> {
    await this.storageManager.setSessionData(sessionData, sessionId);
  }

  public async decodeJwtToken<R = Record<string, unknown>>(token: string): Promise<R> {
    return this.cryptoHelper.decodeJwtToken<R>(token);
  }

  /**
   * Validates a back-channel logout token and returns its claims. Protected, because only an SDK
   * that runs on a server can receive one; such an SDK builds its logout handler on this.
   */
  protected async validateLogoutToken(logoutToken: string): Promise<LogoutTokenClaims> {
    // A logout request can be the first thing a process handles, before any sign-in loaded the metadata.
    await this.loadOpenIDProviderConfiguration(false);

    return this.authHelper.validateLogoutToken(logoutToken);
  }

  public async exchangeToken(
    config: TokenExchangeRequestConfig,
    sessionId?: string,
  ): Promise<TokenResponse | Response | User> {
    if (
      !(await this.storageManager.getTemporaryDataParameter(
        OIDCDiscoveryConstants.Storage.StorageKeys.OPENID_PROVIDER_CONFIG_INITIATED,
      ))
    ) {
      await this.loadOpenIDProviderConfiguration(false);
    }

    const oidcProviderMetadata: OIDCDiscoveryApiResponse = await this.oidcProviderMetaDataProvider();
    const configData = await this.configProvider();

    let tokenEndpoint: string | undefined;

    if (config.tokenEndpoint && config.tokenEndpoint.trim().length !== 0) {
      tokenEndpoint = config.tokenEndpoint;
    } else {
      tokenEndpoint = oidcProviderMetadata.token_endpoint;
    }

    if (!tokenEndpoint || tokenEndpoint.trim().length === 0) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RCG-NF01',
        'Token endpoint not found.',
        'No token endpoint was found in the OIDC provider meta data returned by the well-known endpoint ' +
          'or the token endpoint passed to the SDK is empty.',
      );
    }

    const data: string[] = await Promise.all(
      Object.entries(config.data).map(async ([key, value]: [key: string, value: any]) => {
        const newValue: string = await this.authHelper.replaceCustomGrantTemplateTags(value as string, sessionId);

        return `${key}=${newValue}`;
      }),
    );

    let requestHeaders: Record<string, any> = {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (config.attachToken) {
      requestHeaders = {
        ...requestHeaders,
        Authorization: `Bearer ${(await this.storageManager.getSessionData(sessionId))?.access_token}`,
      };
    }

    const requestConfig: RequestInit = {
      body: data.join('&'),
      credentials: configData.sendCookiesInRequests ? 'include' : 'same-origin',
      headers: new Headers(requestHeaders),
      method: 'POST',
    };

    let response: Response;

    try {
      response = await fetch(tokenEndpoint, requestConfig);
    } catch (error: any) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RCG-NE02',
        'The custom grant request failed.',
        error ?? 'The request sent to get the custom grant failed.',
      );
    }

    if (response.status !== 200 || !response.ok) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RCG-HE03',
        `Invalid response status received for the custom grant request. (${response.statusText})`,
        await readErrorMessage(response, 'The custom grant request was rejected.'),
      );
    }

    if (config.returnsSession) {
      return this.authHelper.handleTokenResponse(response, sessionId);
    }

    return (await response.json()) as TokenResponse | Response;
  }

  // ─── Platform-specific methods (must be overridden by subclasses) ────────────

  public isLoading(): boolean {
    throw new Error('Method not implemented.');
  }

  public signIn(_options?: SignInOptions): Promise<User | TokenResponse | undefined> {
    throw new Error('Method not implemented.');
  }

  public signOut(
    _options?: SignOutOptions,
    _sessionIdOrAfterSignOut?: string | ((afterSignOutUrl: string) => void),
    _afterSignOut?: (afterSignOutUrl: string) => void,
  ): Promise<string | boolean> {
    throw new Error('Method not implemented.');
  }

  public signInSilently(_options?: SignInOptions): Promise<User | boolean | undefined> {
    throw new Error('Method not implemented.');
  }

  public signUp(_options?: SignUpOptions): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public recover(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public getUserProfile(_options?: any): Promise<UserProfile> {
    throw new Error('Method not implemented.');
  }

  public updateUserProfile(_payload: any, _userId?: string): Promise<User> {
    throw new Error('Method not implemented.');
  }

  // ─── OIDC core (protected, used by subclasses) ──────────────────────────────

  protected async loadOpenIDProviderConfiguration(forceInit = false): Promise<void> {
    const configData = await this.configProvider();

    if (
      !forceInit &&
      (await this.storageManager.getTemporaryDataParameter(
        OIDCDiscoveryConstants.Storage.StorageKeys.OPENID_PROVIDER_CONFIG_INITIATED,
      ))
    ) {
      return;
    }

    const {discovery, baseUrl, endpoints} = configData as any;
    const wellKnownOverride: string | undefined = endpoints?.wellKnown;

    // Discovery is enabled by default; only skip if explicitly disabled.
    const resolvedWellKnownEndpoint: string | undefined =
      wellKnownOverride ||
      (discovery?.wellKnown?.enabled !== false && baseUrl ? `${baseUrl}${WELL_KNOWN_PATH}` : undefined);

    if (resolvedWellKnownEndpoint) {
      let response: Response | undefined;

      try {
        response = await fetch(resolvedWellKnownEndpoint);
        if (!response.ok || response.status !== 200) {
          logger.warn(
            `ThunderIDJavaScriptClient: Discovery request to ${resolvedWellKnownEndpoint} returned ` +
              `${response.status}; falling back to endpoints derived from the base URL.`,
          );
          response = undefined;
        }
      } catch (error: unknown) {
        logger.warn(
          `ThunderIDJavaScriptClient: Discovery request to ${resolvedWellKnownEndpoint} failed; ` +
            'falling back to endpoints derived from the base URL.',
          error,
        );
        response = undefined;
      }

      if (response) {
        let discoveryResolved = false;
        let discovered: OIDCDiscoveryApiResponse | undefined;

        try {
          discovered = (await response.json()) as OIDCDiscoveryApiResponse;
        } catch {
          discovered = undefined;
        }

        // Validate the discovered issuer before any endpoint from the document is used. A mismatch
        // fails here rather than falling back to endpoints derived from the base URL.
        if (discovered && typeof discovered === 'object') {
          const expectedIssuer: string | undefined = getExpectedIssuer(endpoints?.issuer, wellKnownOverride, baseUrl);

          if (expectedIssuer !== undefined && !issuersMatch(discovered.issuer, expectedIssuer)) {
            throw new ThunderIDRuntimeError(
              'The discovered issuer does not match the expected issuer. Set endpoints.issuer if your server uses a custom issuer.',
              'JS-AUTH_CORE-GOPMD-IV03',
              'javascript',
            );
          }
        }

        try {
          if (!discovered || typeof discovered !== 'object') {
            throw new Error('The discovery response is not a JSON object.');
          }

          await this.storageManager.setOIDCProviderMetaData(await this.authHelper.resolveEndpoints(discovered));
          discoveryResolved = true;
        } catch (error: unknown) {
          // Parsing or endpoint resolution failed; fall through to baseUrl fallback.
          logger.warn(
            `ThunderIDJavaScriptClient: Could not resolve endpoints from the discovery response of ` +
              `${resolvedWellKnownEndpoint}; falling back to endpoints derived from the base URL.`,
            error,
          );
        }

        if (!discoveryResolved) {
          if (baseUrl) {
            try {
              await this.storageManager.setOIDCProviderMetaData(await this.authHelper.resolveEndpointsByBaseURL());
            } catch (error: unknown) {
              throw new ThunderIDAuthException(
                'JS-AUTH_CORE-GOPMD-IV02',
                'Resolving endpoints failed.',
                error instanceof Error ? error.message : 'Resolving endpoints by base url failed.',
              );
            }
          } else {
            throw new ThunderIDAuthException(
              'JS-AUTH_CORE-GOPMD-HE01',
              'Invalid well-known response',
              'The well known endpoint response has been failed with an error.',
            );
          }
        }
      } else if (baseUrl) {
        try {
          await this.storageManager.setOIDCProviderMetaData(await this.authHelper.resolveEndpointsByBaseURL());
        } catch (error: unknown) {
          throw new ThunderIDAuthException(
            'JS-AUTH_CORE-GOPMD-IV02',
            'Resolving endpoints failed.',
            error instanceof Error ? error.message : 'Resolving endpoints by base url failed.',
          );
        }
      } else {
        throw new ThunderIDAuthException(
          'JS-AUTH_CORE-GOPMD-HE01',
          'Invalid well-known response',
          'The well known endpoint response has been failed with an error.',
        );
      }
    } else if (baseUrl) {
      try {
        await this.storageManager.setOIDCProviderMetaData(await this.authHelper.resolveEndpointsByBaseURL());
      } catch (error: unknown) {
        throw new ThunderIDAuthException(
          'JS-AUTH_CORE-GOPMD-IV02',
          'Resolving endpoints failed.',
          error instanceof Error ? error.message : 'Resolving endpoints by base url failed.',
        );
      }
    } else {
      await this.storageManager.setOIDCProviderMetaData(await this.authHelper.resolveEndpointsExplicitly());
    }

    await this.storageManager.setTemporaryDataParameter(
      OIDCDiscoveryConstants.Storage.StorageKeys.OPENID_PROVIDER_CONFIG_INITIATED,
      true,
    );
  }

  protected async getSignInUrl(requestConfig?: ExtendedAuthorizeRequestUrlParams, userId?: string): Promise<string> {
    const authRequestConfig: ExtendedAuthorizeRequestUrlParams = {...requestConfig};

    delete authRequestConfig?.forceInit;
    delete authRequestConfig?.authorizationDetails;

    const buildSignInUrl = async (): Promise<string> => {
      const authorizeEndpoint: string = (await this.storageManager.getOIDCProviderMetaDataParameter(
        OIDCDiscoveryConstants.Storage.StorageKeys.Endpoints.AUTHORIZATION as keyof OIDCDiscoveryApiResponse,
      )) as string;

      if (!authorizeEndpoint || authorizeEndpoint.trim().length === 0) {
        throw new ThunderIDAuthException(
          'JS-AUTH_CORE-GAU-NF01',
          'No authorization endpoint found.',
          'No authorization endpoint was found in the OIDC provider meta data from the well-known endpoint ' +
            'or the authorization endpoint passed to the SDK is empty.',
        );
      }

      const authorizeRequest: URL = new URL(authorizeEndpoint);
      const configData = await this.configProvider();
      const tempStore: TemporaryStore = await this.storageManager.getTemporaryData(userId);
      const pkceKey: string = await generatePkceStorageKey(tempStore);

      let codeVerifier: string | undefined;
      let codeChallenge: string | undefined;

      if (configData.enablePKCE) {
        codeVerifier = this.cryptoHelper?.getCodeVerifier();
        codeChallenge = await this.cryptoHelper?.getCodeChallenge(codeVerifier);
        await this.storageManager.setHybridDataParameter(pkceKey, codeVerifier, userId);
      }

      if (authRequestConfig['client_secret']) {
        authRequestConfig['client_secret'] = configData.clientSecret ?? '';
      }

      const authorizeRequestParams: Map<string, string> = getAuthorizeRequestUrlParams(
        Object.fromEntries(
          Object.entries({
            authorizationDetails: requestConfig?.authorizationDetails ?? configData.authorizationDetails,
            clientId: configData.clientId ?? '',
            codeChallenge,
            codeChallengeMethod: PKCEConstants.DEFAULT_CODE_CHALLENGE_METHOD,
            instanceId: this.getInstanceId().toString(),
            prompt: configData.prompt,
            randomState: this.cryptoHelper.generateState(),
            redirectUri: configData.afterSignInUrl ?? '',
            responseMode: configData.responseMode,
            scopes: processOpenIDScopes(configData.scopes),
          }).filter(([, v]) => v !== undefined),
        ) as Parameters<typeof getAuthorizeRequestUrlParams>[0],
        {key: pkceKey},
        authRequestConfig,
      );

      // Kept so the callback can be compared with the state this request sent.
      await this.storageManager.setHybridDataParameter(
        getStateStorageKey(pkceKey),
        authorizeRequestParams.get(OIDCRequestConstants.Params.STATE) ?? '',
        userId,
      );

      Array.from(authorizeRequestParams.entries()).forEach(([paramKey, paramValue]: [string, string]) => {
        authorizeRequest.searchParams.append(paramKey, paramValue);
      });

      return authorizeRequest.toString();
    };

    if (
      await this.storageManager.getTemporaryDataParameter(
        OIDCDiscoveryConstants.Storage.StorageKeys.OPENID_PROVIDER_CONFIG_INITIATED,
      )
    ) {
      return buildSignInUrl();
    }

    return this.loadOpenIDProviderConfiguration(requestConfig?.forceInit).then(() => buildSignInUrl());
  }

  protected async requestAccessToken(
    authorizationCode: string,
    state: string,
    userId?: string,
    tokenRequestConfig?: {params: Record<string, unknown>},
  ): Promise<TokenResponse> {
    if (
      !(await this.storageManager.getTemporaryDataParameter(
        OIDCDiscoveryConstants.Storage.StorageKeys.OPENID_PROVIDER_CONFIG_INITIATED,
      ))
    ) {
      await this.loadOpenIDProviderConfiguration(false);
    }

    const stateStorageKey: string = getStateStorageKey(extractPkceStorageKeyFromState(state ?? ''));
    const expectedState: unknown = await this.storageManager.getHybridDataParameter(stateStorageKey, userId);

    // The stored state is left in place on a mismatch, so a stray callback cannot cancel the
    // sign-in that is still in progress.
    if (!state || typeof expectedState !== 'string' || !expectedState || state !== expectedState) {
      throw new ThunderIDRuntimeError(
        'The state returned to the callback does not match the state of the authorization request.',
        'JS-AUTH_CORE-RAT1-IV04',
        'javascript',
      );
    }

    await this.storageManager.removeHybridDataParameter(stateStorageKey, userId);

    const tokenEndpoint: string | undefined = (await this.oidcProviderMetaDataProvider()).token_endpoint;
    const configData = await this.configProvider();

    if (!tokenEndpoint || tokenEndpoint.trim().length === 0) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT1-NF01',
        'Token endpoint not found.',
        'No token endpoint was found in the OIDC provider meta data returned by the well-known endpoint ' +
          'or the token endpoint passed to the SDK is empty.',
      );
    }

    const body: URLSearchParams = new URLSearchParams();

    body.set('client_id', configData.clientId ?? '');

    const hasSecret = Boolean(configData.clientSecret && configData.clientSecret.trim().length > 0);
    const tokenEndpointAuthMethod = configData.tokenRequest?.authMethod ?? 'client_secret_basic';

    if (hasSecret && tokenEndpointAuthMethod === 'client_secret_post') {
      body.set('client_secret', configData.clientSecret!);
    }

    body.set('code', authorizationCode);
    body.set('grant_type', 'authorization_code');
    body.set('redirect_uri', configData.afterSignInUrl ?? '');

    if (tokenRequestConfig?.params) {
      Object.entries(tokenRequestConfig.params).forEach(([key, value]: [string, unknown]) => {
        body.append(key, value as string);
      });
    }

    if (configData.enablePKCE) {
      body.set(
        'code_verifier',
        `${await this.storageManager.getHybridDataParameter(extractPkceStorageKeyFromState(state), userId)}`,
      );
      await this.storageManager.removeHybridDataParameter(extractPkceStorageKeyFromState(state), userId);
    }

    const tokenRequestHeaders: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (hasSecret && tokenEndpointAuthMethod === 'client_secret_basic') {
      const credential = `${encodeURIComponent(configData.clientId!)}:${encodeURIComponent(configData.clientSecret!)}`;
      tokenRequestHeaders['Authorization'] = `Basic ${base64Encode(credential)}`;
    }

    let tokenResponse: Response;

    try {
      tokenResponse = await fetch(tokenEndpoint, {
        body,
        credentials: configData.sendCookiesInRequests ? 'include' : 'same-origin',
        headers: tokenRequestHeaders,
        method: 'POST',
      });
    } catch (error: any) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT1-NE02',
        'Requesting access token failed',
        error ?? 'The request to get the access token from the server failed.',
      );
    }

    if (!tokenResponse.ok) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT1-HE03',
        `Requesting access token failed with ${tokenResponse.statusText}`,
        await readErrorMessage(tokenResponse, 'The token request was rejected.'),
      );
    }

    return this.authHelper.handleTokenResponse(tokenResponse, userId);
  }

  protected async getSignOutUrl(userId?: string): Promise<string> {
    const logoutEndpoint: string | undefined = (await this.oidcProviderMetaDataProvider())?.end_session_endpoint;
    const configData = await this.configProvider();

    if (!logoutEndpoint || logoutEndpoint.trim().length === 0) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-GSOU-NF01',
        'Sign-out endpoint not found.',
        'No sign-out endpoint was found in the OIDC provider meta data returned by the well-known endpoint ' +
          'or the sign-out endpoint passed to the SDK is empty.',
      );
    }

    const callbackURL: string | undefined = configData?.afterSignOutUrl ?? configData?.afterSignInUrl;

    if (!callbackURL || callbackURL.trim().length === 0) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-GSOU-NF03',
        'No sign-out redirect URL found.',
        'The sign-out redirect URL cannot be found or the URL passed to the SDK is empty.',
      );
    }

    const queryParams: URLSearchParams = new URLSearchParams();

    queryParams.set('post_logout_redirect_uri', callbackURL);

    // Include id_token_hint by default when an ID token is available: OIDC RP-Initiated Logout
    // recommends it, and some OPs (including ThunderID) require it alongside post_logout_redirect_uri.
    // Fall back to client_id when no ID token is available. Set sendIdTokenInLogoutRequest: false to
    // always send client_id instead.
    const idToken: string = (await this.storageManager.getSessionData(userId))?.id_token;

    if (configData.sendIdTokenInLogoutRequest !== false && idToken && idToken.trim().length > 0) {
      queryParams.set('id_token_hint', idToken);
    } else {
      queryParams.set('client_id', configData.clientId ?? '');
    }

    queryParams.set('state', OIDCRequestConstants.Params.SIGN_OUT_SUCCESS);

    return `${logoutEndpoint}?${queryParams.toString()}`;
  }

  /**
   * Returns the endpoints the SDK calls. Loads the discovery document first when no other call has.
   */
  protected async getOpenIDProviderEndpoints(): Promise<Partial<OIDCEndpoints>> {
    await this.loadOpenIDProviderConfiguration(false);

    const meta: OIDCDiscoveryApiResponse = await this.oidcProviderMetaDataProvider();

    return {
      authorizationEndpoint: meta.authorization_endpoint ?? '',
      endSessionEndpoint: meta.end_session_endpoint ?? '',
      introspectionEndpoint: meta.introspection_endpoint ?? '',
      issuer: meta.issuer ?? '',
      jwksUri: meta.jwks_uri ?? '',
      registrationEndpoint: meta.registration_endpoint ?? '',
      revocationEndpoint: meta.revocation_endpoint ?? '',
      tokenEndpoint: meta.token_endpoint ?? '',
      userinfoEndpoint: meta.userinfo_endpoint ?? '',
    };
  }

  /**
   * Returns the discovery document. Loads it first when no other call has. Resolves to `null`
   * before `initialize()`.
   */
  public async getDiscoveryResponse(): Promise<OIDCDiscoveryApiResponse | null> {
    if (!this.storageManager) {
      return null;
    }

    await this.loadOpenIDProviderConfiguration(false);

    return this.storageManager.loadOpenIDProviderConfiguration();
  }

  /**
   * Returns the claims of the session's ID token, or of `idToken` when the session holds none.
   *
   * @throws {ThunderIDRuntimeError} With code `JS-AUTH_CORE-GDIT-NF01` when there is no ID token to decode.
   */
  protected async getDecodedIdToken(userId?: string, idToken?: string): Promise<IdToken> {
    const token: string | undefined = (await this.storageManager.getSessionData(userId))?.id_token ?? idToken;

    if (!token) {
      throw new ThunderIDRuntimeError('No signed-in session was found.', 'JS-AUTH_CORE-GDIT-NF01', 'javascript');
    }

    return this.cryptoHelper.decodeJwtToken<IdToken>(token);
  }

  protected async getIdToken(userId?: string): Promise<string> {
    return (await this.storageManager.getSessionData(userId))?.id_token;
  }

  protected async getUserSession(userId?: string): Promise<UserSession> {
    const sessionData: SessionData = await this.storageManager.getSessionData(userId);

    return {
      authorizationDetails: sessionData?.authorization_details,
      scopes: sessionData?.scope?.split(' '),
    };
  }

  protected async refreshAccessToken(userId?: string): Promise<TokenResponse | User> {
    const tokenEndpoint: string | undefined = (await this.oidcProviderMetaDataProvider()).token_endpoint;
    const configData = await this.configProvider();
    const sessionData: SessionData = await this.storageManager.getSessionData(userId);

    if (!sessionData.refresh_token) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT2-NF01',
        'No refresh token found.',
        "There was no refresh token found. The server doesn't return a refresh token if the refresh token grant is not enabled.",
      );
    }

    if (!tokenEndpoint || tokenEndpoint.trim().length === 0) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT2-NF02',
        'No refresh token endpoint found.',
        'No refresh token endpoint was in the OIDC provider meta data returned by the well-known endpoint.',
      );
    }

    const body: string[] = [
      `client_id=${configData.clientId}`,
      `refresh_token=${sessionData.refresh_token}`,
      'grant_type=refresh_token',
    ];

    if (configData.clientSecret && configData.clientSecret.trim().length > 0) {
      body.push(`client_secret=${configData.clientSecret}`);
    }

    let tokenResponse: Response;

    try {
      tokenResponse = await fetch(tokenEndpoint, {
        body: body.join('&'),
        credentials: configData.sendCookiesInRequests ? 'include' : 'same-origin',
        headers: {Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'},
        method: 'POST',
      });
    } catch (error: any) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT2-NR03',
        'Refresh access token request failed.',
        error ?? 'The request to refresh the access token failed.',
      );
    }

    if (!tokenResponse.ok) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT2-HE04',
        `Refreshing access token failed with ${tokenResponse.statusText}`,
        await readErrorMessage(tokenResponse, 'The refresh token request was rejected.'),
      );
    }

    return this.authHelper.handleTokenResponse(tokenResponse, userId);
  }

  /**
   * Requests a machine-to-machine access token via the `client_credentials` grant
   * (RFC 6749 §4.4) and caches it under the given session key. Unlike the user-facing
   * flows, there's no id_token or refresh_token: the service authenticates as itself.
   */
  protected async requestClientCredentialsToken(sessionId?: string): Promise<TokenResponse> {
    if (
      !(await this.storageManager.getTemporaryDataParameter(
        OIDCDiscoveryConstants.Storage.StorageKeys.OPENID_PROVIDER_CONFIG_INITIATED,
      ))
    ) {
      await this.loadOpenIDProviderConfiguration(false);
    }

    const tokenEndpoint: string | undefined = (await this.oidcProviderMetaDataProvider()).token_endpoint;
    const configData = await this.configProvider();

    if (!tokenEndpoint || tokenEndpoint.trim().length === 0) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RCCT-NF01',
        'Token endpoint not found.',
        'No token endpoint was found in the OIDC provider meta data returned by the well-known endpoint ' +
          'or the token endpoint passed to the SDK is empty.',
      );
    }

    const body: URLSearchParams = new URLSearchParams();

    body.set('grant_type', 'client_credentials');
    body.set('client_id', configData.clientId ?? '');

    const hasSecret = Boolean(configData.clientSecret && configData.clientSecret.trim().length > 0);
    const tokenEndpointAuthMethod = configData.tokenRequest?.authMethod ?? 'client_secret_basic';

    if (hasSecret && tokenEndpointAuthMethod === 'client_secret_post') {
      body.set('client_secret', configData.clientSecret!);
    }

    const scope = Array.isArray(configData.scopes) ? configData.scopes.join(' ') : configData.scopes;

    if (scope) {
      body.set('scope', scope);
    }

    if (configData.authorizationDetails?.length) {
      body.set('authorization_details', JSON.stringify(configData.authorizationDetails));
    }

    if (configData.tokenRequest?.params) {
      Object.entries(configData.tokenRequest.params).forEach(([key, value]: [string, unknown]) => {
        body.set(key, value as string);
      });
    }

    const tokenRequestHeaders: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (hasSecret && tokenEndpointAuthMethod === 'client_secret_basic') {
      const credential = `${encodeURIComponent(configData.clientId!)}:${encodeURIComponent(configData.clientSecret!)}`;
      tokenRequestHeaders['Authorization'] = `Basic ${base64Encode(credential)}`;
    }

    let tokenResponse: Response;

    try {
      tokenResponse = await fetch(tokenEndpoint, {
        body,
        headers: tokenRequestHeaders,
        method: 'POST',
      });
    } catch (error: any) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RCCT-NE02',
        'Requesting client credentials token failed.',
        error ?? 'The request to get the client credentials access token failed.',
      );
    }

    if (!tokenResponse.ok) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RCCT-HE03',
        `Requesting client credentials token failed with ${tokenResponse.statusText}`,
        await readErrorMessage(tokenResponse, 'The client credentials token request was rejected.'),
      );
    }

    const parsedResponse = (await tokenResponse.json()) as AccessTokenApiResponse;

    parsedResponse.created_at = new Date().getTime();

    await this.storageManager.setSessionData(parsedResponse, sessionId);

    return {
      accessToken: parsedResponse.access_token,
      authorizationDetails: parsedResponse.authorization_details,
      createdAt: parsedResponse.created_at,
      expiresIn: parsedResponse.expires_in,
      idToken: parsedResponse.id_token ?? '',
      refreshToken: parsedResponse.refresh_token ?? '',
      scope: parsedResponse.scope,
      tokenType: parsedResponse.token_type,
    };
  }

  /**
   * Sends the access token revocation request to the OP's `revocation_endpoint`. Unlike
   * {@link revokeAccessToken}, this does not clear the local session, so callers that need to read
   * session data (e.g. the ID token for RP-Initiated Logout) after revoking can do so.
   */
  protected async requestAccessTokenRevocation(userId?: string): Promise<Response> {
    const revokeTokenEndpoint: string | undefined = (await this.oidcProviderMetaDataProvider()).revocation_endpoint;
    const configData = await this.configProvider();

    if (!revokeTokenEndpoint || revokeTokenEndpoint.trim().length === 0) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT3-NF01',
        'No revoke access token endpoint found.',
        'No revoke access token endpoint was found in the OIDC provider meta data.',
      );
    }

    const body: string[] = [
      `client_id=${configData.clientId}`,
      `token=${(await this.storageManager.getSessionData(userId)).access_token}`,
      'token_type_hint=access_token',
    ];

    if (configData.clientSecret && configData.clientSecret.trim().length > 0) {
      body.push(`client_secret=${configData.clientSecret}`);
    }

    let response: Response;

    try {
      response = await fetch(revokeTokenEndpoint, {
        body: body.join('&'),
        credentials: configData.sendCookiesInRequests ? 'include' : 'same-origin',
        headers: {Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'},
        method: 'POST',
        signal: AbortSignal.timeout(REVOKE_ACCESS_TOKEN_REQUEST_TIMEOUT_MS),
      });
    } catch (error: any) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT3-NE02',
        'The request to revoke access token failed.',
        error ?? 'The request sent to revoke the access token failed.',
      );
    }

    if (response.status !== 200 || !response.ok) {
      throw new ThunderIDAuthException(
        'JS-AUTH_CORE-RAT3-HE03',
        `Invalid response status received for revoke access token request (${response.statusText}).`,
        await readErrorMessage(response, 'The revocation request was rejected.'),
      );
    }

    return response;
  }

  protected async revokeAccessToken(userId?: string): Promise<Response | boolean> {
    const response = await this.requestAccessTokenRevocation(userId);

    this.authHelper.clearSession(userId);

    return response;
  }

  public async initiateCIBA(options: CIBAInitiateOptions): Promise<CIBAInitiateResponse> {
    if (
      !(await this.storageManager.getTemporaryDataParameter(
        OIDCDiscoveryConstants.Storage.StorageKeys.OPENID_PROVIDER_CONFIG_INITIATED,
      ))
    ) {
      await this.loadOpenIDProviderConfiguration(false);
    }

    const backchannelEndpoint: string | undefined = (await this.oidcProviderMetaDataProvider())
      .backchannel_authentication_endpoint;

    if (!backchannelEndpoint || backchannelEndpoint.trim().length === 0) {
      throw new ThunderIDAPIError(
        'No backchannel_authentication_endpoint was found in the OIDC provider metadata.',
        'JS-AUTH_CORE-CIBA1-NF01',
        'javascript',
      );
    }

    const hintCount = [options.loginHint, options.loginHintToken, options.idTokenHint].filter(Boolean).length;

    if (hintCount === 0) {
      throw new ThunderIDAPIError(
        'Provide one of loginHint, loginHintToken, or idTokenHint.',
        'JS-AUTH_CORE-CIBA1-IV01',
        'javascript',
        undefined,
        undefined,
        'CIBA initiation requires exactly one hint',
      );
    }

    if (hintCount > 1) {
      throw new ThunderIDAPIError(
        'Only one of loginHint, loginHintToken, or idTokenHint may be set.',
        'JS-AUTH_CORE-CIBA1-IV02',
        'javascript',
        undefined,
        undefined,
        'CIBA initiation received multiple hints',
      );
    }

    const configData = await this.configProvider();
    const hasSecret = Boolean(configData.clientSecret && configData.clientSecret.trim().length > 0);
    const tokenEndpointAuthMethod = configData.tokenRequest?.authMethod ?? 'client_secret_basic';

    const body = new URLSearchParams();

    body.set('client_id', configData.clientId ?? '');

    if (hasSecret && tokenEndpointAuthMethod === 'client_secret_post') {
      body.set('client_secret', configData.clientSecret!);
    }

    const scopeStr = processOpenIDScopes(configData.scopes);
    if (scopeStr) body.set('scope', scopeStr);
    if (options.loginHint) body.set('login_hint', options.loginHint);
    if (options.loginHintToken) body.set('login_hint_token', options.loginHintToken);
    if (options.idTokenHint) body.set('id_token_hint', options.idTokenHint);
    if (options.bindingMessage) body.set('binding_message', options.bindingMessage);
    if (options.acrValues) body.set('acr_values', options.acrValues);
    if (options.requestedExpiry !== undefined) body.set('requested_expiry', String(options.requestedExpiry));

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (hasSecret && tokenEndpointAuthMethod === 'client_secret_basic') {
      const credential = `${encodeURIComponent(configData.clientId!)}:${encodeURIComponent(configData.clientSecret!)}`;
      headers['Authorization'] = `Basic ${base64Encode(credential)}`;
    }

    let response: Response;

    try {
      response = await fetch(backchannelEndpoint, {
        body,
        credentials: configData.sendCookiesInRequests ? 'include' : 'same-origin',
        headers,
        method: 'POST',
      });
    } catch (error: any) {
      throw new ThunderIDAPIError(
        error ?? 'The request to the backchannel authentication endpoint failed.',
        'JS-AUTH_CORE-CIBA1-NE02',
        'javascript',
        undefined,
        undefined,
        'CIBA backchannel authentication request failed',
      );
    }

    const rawBody = await response.text().catch(() => '');
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }

    if (!response.ok) {
      throw new ThunderIDAPIError(
        getOAuthErrorMessage(parsedBody, 'The backchannel authentication request was rejected.'),
        'JS-AUTH_CORE-CIBA1-HE03',
        'javascript',
        response.status,
        response.statusText,
        'CIBA backchannel authentication request failed',
      );
    }

    const payload = parsedBody as {auth_req_id?: string; expires_in?: number; interval?: number};

    if (!payload.auth_req_id) {
      throw new ThunderIDAPIError(
        'The server response did not include an auth_req_id.',
        'JS-AUTH_CORE-CIBA1-PR04',
        'javascript',
      );
    }

    return {
      authReqId: payload.auth_req_id,
      expiresIn: payload.expires_in ?? 120,
      interval: payload.interval ?? 5,
    };
  }

  public async pollCIBA(authReqId: string, interval: number, options?: CIBAPollOptions): Promise<TokenResponse> {
    const tokenEndpoint: string | undefined = (await this.oidcProviderMetaDataProvider()).token_endpoint;
    const configData = await this.configProvider();

    if (!tokenEndpoint || tokenEndpoint.trim().length === 0) {
      throw new ThunderIDAPIError(
        'No token endpoint was found in the OIDC provider metadata.',
        'JS-AUTH_CORE-CIBA2-NF01',
        'javascript',
      );
    }

    const hasSecret = Boolean(configData.clientSecret && configData.clientSecret.trim().length > 0);
    const tokenEndpointAuthMethod = configData.tokenRequest?.authMethod ?? 'client_secret_basic';

    const buildBody = (): URLSearchParams => {
      const body = new URLSearchParams();
      body.set('grant_type', 'urn:openid:params:grant-type:ciba');
      body.set('auth_req_id', authReqId);
      body.set('client_id', configData.clientId ?? '');
      if (hasSecret && tokenEndpointAuthMethod === 'client_secret_post') {
        body.set('client_secret', configData.clientSecret!);
      }
      return body;
    };

    const buildHeaders = (): Record<string, string> => {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      if (hasSecret && tokenEndpointAuthMethod === 'client_secret_basic') {
        const credential = `${encodeURIComponent(configData.clientId!)}:${encodeURIComponent(configData.clientSecret!)}`;
        headers['Authorization'] = `Basic ${base64Encode(credential)}`;
      }
      return headers;
    };

    let currentInterval = interval;

    while (true) {
      if (options?.signal?.aborted) {
        throw new ThunderIDAPIError('CIBA polling was cancelled.', 'JS-AUTH_CORE-CIBA2-AB05', 'javascript');
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, currentInterval * 1000);
        options?.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new ThunderIDAPIError('CIBA polling was cancelled.', 'JS-AUTH_CORE-CIBA2-AB05', 'javascript'));
          },
          {once: true},
        );
      });

      let pollResponse: Response;

      try {
        pollResponse = await fetch(tokenEndpoint, {
          body: buildBody(),
          credentials: configData.sendCookiesInRequests ? 'include' : 'same-origin',
          headers: buildHeaders(),
          method: 'POST',
          signal: options?.signal,
        });
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          throw new ThunderIDAPIError('CIBA polling was cancelled.', 'JS-AUTH_CORE-CIBA2-AB05', 'javascript');
        }
        throw new ThunderIDAPIError(
          error ?? 'The polling request to the token endpoint failed.',
          'JS-AUTH_CORE-CIBA2-NE02',
          'javascript',
          undefined,
          undefined,
          'CIBA token polling request failed',
        );
      }

      if (pollResponse.ok) {
        return this.authHelper.handleTokenResponse(pollResponse);
      }

      const rawPollBody = await pollResponse.text().catch(() => '');
      let errorPayload: {error?: string; error_description?: string};
      try {
        errorPayload = JSON.parse(rawPollBody);
      } catch {
        errorPayload = {};
      }
      const errorCode = errorPayload.error;

      if (errorCode === 'authorization_pending') {
        continue;
      }

      if (errorCode === 'slow_down') {
        currentInterval += 5;
        continue;
      }

      throw new ThunderIDAPIError(
        JSON.stringify(errorPayload),
        'JS-AUTH_CORE-CIBA2-HE03',
        'javascript',
        pollResponse.status,
        pollResponse.statusText,
        `CIBA polling terminated: ${errorCode}`,
      );
    }
  }

  protected async getPKCECode(state: string, userId?: string): Promise<string> {
    return (await this.storageManager.getHybridDataParameter(extractPkceStorageKeyFromState(state), userId)) as string;
  }

  protected async setPKCECode(pkce: string, state: string, userId?: string): Promise<void> {
    return this.storageManager.setHybridDataParameter(extractPkceStorageKeyFromState(state), pkce, userId);
  }

  public getInstanceId(): number {
    return this.instanceIdValue;
  }

  protected getStorageManager(): StorageManager<T> {
    return this.storageManager;
  }

  protected getCryptoHelper(): IsomorphicCrypto {
    return this.cryptoHelper;
  }

  // ─── Static helpers ──────────────────────────────────────────────────────────

  public static isSignOutSuccessful(afterSignOutUrl: string): boolean {
    const url: URL = new URL(afterSignOutUrl);
    const stateParam: string | null = url.searchParams.get(OIDCRequestConstants.Params.STATE);
    const error = Boolean(url.searchParams.get('error'));

    return stateParam ? stateParam === OIDCRequestConstants.Params.SIGN_OUT_SUCCESS && !error : false;
  }

  public static didSignOutFail(afterSignOutUrl: string): boolean {
    const url: URL = new URL(afterSignOutUrl);
    const stateParam: string | null = url.searchParams.get(OIDCRequestConstants.Params.STATE);
    const error = Boolean(url.searchParams.get('error'));

    return stateParam ? stateParam === OIDCRequestConstants.Params.SIGN_OUT_SUCCESS && error : false;
  }

  // ─── Agent / OBO helpers ─────────────────────────────────────────────────────

  public async getOBOSignInURL(agentConfig: AgentConfig): Promise<string> {
    const authURL: string = await this.getSignInUrl({requested_actor: agentConfig.agentID});

    if (authURL) {
      return authURL.toString();
    }

    throw new Error('Could not build Authorize URL');
  }
}

export default ThunderIDJavaScriptClient;
