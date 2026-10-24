// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AuthorizeRequestParamValue,
  ThunderIDJavaScriptClient,
  ThunderIDAuthException,
  User,
  IsomorphicCrypto,
  IdToken,
  OIDCEndpoints,
  OIDCRequestConstants,
  SessionConfig,
  Storage,
  TokenResponse,
  extractPkceStorageKeyFromState,
  HttpError,
  HttpRequestConfig,
  HttpResponse,
  UserProfile,
  createPackageComponentLogger,
  generateFlattenedUserProfile,
  getUsersMe,
  resolveResourceEndpoint,
} from '@thunderid/javascript';
import Hooks from './constants/Hooks';
import {REFRESH_ACCESS_TOKEN_ERR0R, SILENT_SIGN_IN_STATE, TOKEN_REQUEST_CONFIG_KEY} from './constants/SPAConstants';
import FetchHttpClient from './FetchHttpClient';
import {BrowserAuthConfig} from './models/BrowserConfig';
import BrowserStorage from './models/BrowserStorage';
import SignInConfig from './models/SignInConfig';
import SignOutError from './models/SignOutError';
import {SPATokenExchangeConfig} from './models/TokenExchangeConfig';
import LocalStore from './stores/LocalStore';
import MemoryStore from './stores/MemoryStore';
import SessionStore from './stores/SessionStore';
import AuthenticationHelper from './utils/AuthenticationHelper';
import createHttpClientFetcher from './utils/createHttpClientFetcher';
import navigate from './utils/navigate';
import SPACryptoUtils from './utils/SPACryptoUtils';
import SPAHelper from './utils/SPAHelper';
import SPAUtils from './utils/SPAUtils';

const logger = createPackageComponentLogger('@thunderid/browser', 'ThunderIDBrowserClient');

const BROWSER_DEFAULT_CONFIG = {
  autoLogoutOnTokenRefreshError: false,
  periodicTokenRefresh: false,
};

type HookCallback = (response?: any) => void | Promise<void>;

const initiateStore = (storage: BrowserStorage | string | undefined): Storage => {
  switch (storage) {
    case BrowserStorage.LocalStorage:
    case 'localStorage':
      return new LocalStore();
    case BrowserStorage.BrowserMemory:
    case 'browserMemory':
      return new MemoryStore();
    default:
      return new SessionStore();
  }
};

class ThunderIDBrowserClient<T = BrowserAuthConfig> extends ThunderIDJavaScriptClient<T> {
  private _browserInstanceId = 0;
  private _httpClient: FetchHttpClient | undefined;
  private _spaHelper: SPAHelper<T> | undefined;
  private _authHelper: AuthenticationHelper<T> | undefined;
  private _storage: BrowserStorage | string = BrowserStorage.SessionStorage;
  private _getSignOutURLFromSessionStorage = false;
  private _isHttpHandlerEnabled = true;
  private _hookCallbacks = new Map<string, Set<HookCallback>>();
  private _initialized = false;
  private _startedInitialize = false;

  public constructor(instanceId = 0) {
    super(undefined, new SPACryptoUtils());
    this._browserInstanceId = instanceId;
  }

  public override async initialize(config: T, storage?: Storage): Promise<boolean> {
    this._startedInitialize = true;
    this._initialized = false;

    const configAny = config as any;
    this._storage = configAny.storage ?? BrowserStorage.SessionStorage;

    const merged = {
      afterSignInUrl: window.location.origin,
      afterSignOutUrl: window.location.origin,
      ...BROWSER_DEFAULT_CONFIG,
      ...configAny,
      instanceId: this._browserInstanceId,
    };
    const store: Storage = storage ?? initiateStore(this._storage as BrowserStorage);

    await super.initialize(merged as unknown as T, store);

    const sm = this.getStorageManager();
    this._spaHelper = new SPAHelper<T>(sm);

    const attachToken = async (request: HttpRequestConfig): Promise<void> => {
      await this._authHelper?.attachTokenToRequestConfig(request);
    };

    this._httpClient = FetchHttpClient.getInstance(this._browserInstanceId, true, attachToken);
    this._httpClient.setHttpRequestStartCallback((request: HttpRequestConfig) => {
      void this._emitHook(Hooks.HttpRequestStart, request);
    });
    this._httpClient.setHttpRequestSuccessCallback((response: HttpResponse) => {
      void this._emitHook(Hooks.HttpRequestSuccess, response);
    });

    this._authHelper = new AuthenticationHelper<T>(sm, this._spaHelper, this._browserInstanceId, {
      exchangeToken: (cfg: SPATokenExchangeConfig) => super.exchangeToken(cfg as any),
      getAccessToken: (sessionId?: string) => this.getAccessToken(sessionId),
      getCrypto: async () => this.getCryptoHelper() as unknown as IsomorphicCrypto,
      getDecodedIdToken: (sessionId?: string) => this.getDecodedIdToken(sessionId),
      getIDPAccessToken: async () => ((await sm.getSessionData()) as any)?.access_token,
      getIdToken: () => this.getIdToken(),
      getOpenIDProviderEndpoints: async () => this.getOpenIDProviderEndpoints() as Promise<OIDCEndpoints>,
      getUser: () => this.getUser(),
      isSignedIn: () => this.isSignedIn(),
      refreshAccessToken: () => super.refreshAccessToken(),
      setPKCECode: (pkceKey: string, state: string) => this.setPKCECode(pkceKey, state),
    });

    this._initialized = true;

    void this._emitHook(Hooks.Initialize, true);

    if (!merged.autoLogoutOnTokenRefreshError) {
      return true;
    }

    window.addEventListener('message', (event) => {
      if (event?.data?.type === REFRESH_ACCESS_TOKEN_ERR0R) {
        this.signOut();
      }
    });

    return true;
  }

  public async isInitialized(): Promise<boolean> {
    if (!this._startedInitialize) {
      return false;
    }

    const sleep = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 1));
    let iterations = 0;

    while (!this._initialized) {
      if (iterations === 1e4) {
        logger.warn('Initialization is taking longer than expected');
      }
      await sleep();
      iterations++;
    }

    return true;
  }

  private async _validateMethod(validateAuthentication = true): Promise<boolean> {
    if (!(await this.isInitialized())) {
      return Promise.reject(
        new ThunderIDAuthException(
          'SPA-AUTH_CLIENT-VM-NF01',
          'The SDK is not initialized.',
          'The SDK must be initialized first.',
        ),
      );
    }

    if (validateAuthentication && !(await this.isSignedIn())) {
      return Promise.reject(
        new ThunderIDAuthException(
          'SPA-AUTH_CLIENT-VM-IV02',
          'The user is not authenticated.',
          'The user must be authenticated first.',
        ),
      );
    }

    return true;
  }

  public override isLoading(): boolean {
    return false;
  }

  public override async signIn(
    config?: SignInConfig,
    authorizationCode?: string,
    state?: string,
    tokenRequestConfig?: {params: Record<string, unknown>},
  ): Promise<User | undefined> {
    await this.isInitialized();

    if (!SPAUtils.canContinueSignIn(Boolean(config?.callOnlyOnRedirect), authorizationCode)) {
      return undefined;
    }

    delete config?.callOnlyOnRedirect;

    const user = await this._signInInternal(config, authorizationCode, state, tokenRequestConfig);

    if (user) {
      void this._emitHook(Hooks.SignIn, user);
    }

    return user;
  }

  private async _signInInternal(
    signInConfig?: SignInConfig,
    authorizationCode?: string,
    state?: string,
    tokenRequestConfig?: {params: Record<string, unknown>},
  ): Promise<User> {
    const sm = this.getStorageManager();
    const config = await (sm as any).getConfigData();

    const basicUserInfo = await this._authHelper!.handleSignIn();

    if (basicUserInfo) {
      return basicUserInfo;
    }

    let resolvedAuthorizationCode: string;
    let resolvedState: string;
    let resolvedTokenRequestConfig: {params: Record<string, unknown>} = {params: {}};

    if (config?.responseMode === 'form_post' && authorizationCode) {
      resolvedAuthorizationCode = authorizationCode;
      resolvedState = state ?? '';
    } else {
      resolvedAuthorizationCode =
        new URL(window.location.href).searchParams.get(OIDCRequestConstants.Params.AUTHORIZATION_CODE) ?? '';
      resolvedState = new URL(window.location.href).searchParams.get(OIDCRequestConstants.Params.STATE) ?? '';

      SPAUtils.removeAuthorizationCode();
    }

    if (resolvedAuthorizationCode && resolvedState) {
      (sm as any).setSessionStatus('true');
      const storedTokenRequestConfig = await (sm as any).getTemporaryDataParameter(TOKEN_REQUEST_CONFIG_KEY);
      if (storedTokenRequestConfig && typeof storedTokenRequestConfig === 'string') {
        resolvedTokenRequestConfig = JSON.parse(storedTokenRequestConfig);
      }
      return this._exchangeCodeForTokens(resolvedAuthorizationCode, resolvedState, resolvedTokenRequestConfig);
    }

    // Opt-in: look for an existing ThunderID SSO session before leaving the app. Skipped inside an
    // iframe, and when the caller asks for a specific prompt (login, consent, ...), which a silent
    // request cannot honour.
    const sessionConfig: SessionConfig | undefined = (config as BrowserAuthConfig | undefined)?.session;

    if (sessionConfig?.silentSignIn?.beforeRedirect && window.self === window.top && !signInConfig?.['prompt']) {
      try {
        const silentUser: User | boolean = await this._signInSilentlyInternal(signInConfig, tokenRequestConfig);

        if (silentUser && typeof silentUser === 'object') {
          return silentUser;
        }
      } catch (error) {
        logger.debug('Checking for an existing session failed; continuing with the sign-in redirect.', error);
      }
    }

    return this.getSignInUrl(signInConfig as any).then(async (url: string) => {
      if (this._storage === BrowserStorage.BrowserMemory && config.enablePKCE) {
        const pkceKey: string = extractPkceStorageKeyFromState(resolvedState);
        SPAUtils.setPKCE(pkceKey, await this.getPKCECode(resolvedState));
      }

      if (tokenRequestConfig) {
        (sm as any).setTemporaryDataParameter(TOKEN_REQUEST_CONFIG_KEY, JSON.stringify(tokenRequestConfig));
      }

      location.href = url;
      await SPAUtils.waitTillPageRedirect();

      return {allowedScopes: '', displayName: '', email: '', sub: '', tenantDomain: '', username: ''};
    });
  }

  private async _exchangeCodeForTokens(
    authorizationCode: string,
    state: string,
    tokenRequestConfig?: {params: Record<string, unknown>},
  ): Promise<User> {
    const sm = this.getStorageManager();
    const config = await (sm as any).getConfigData();

    if (this._storage === BrowserStorage.BrowserMemory && config.enablePKCE && state) {
      const pkceKey = extractPkceStorageKeyFromState(state);
      const pkce = SPAUtils.getPKCE(pkceKey);
      await this.setPKCECode(pkce, pkceKey);
    }

    await this.requestAccessToken(authorizationCode, state ?? '', undefined, tokenRequestConfig);

    try {
      const signOutUrl = await this.getSignOutUrl();
      SPAUtils.setSignOutURL(signOutUrl, config.clientId, this._browserInstanceId);
    } catch {
      // end_session_endpoint absent — signOut() falls back to signInUrl navigation.
    }

    await this._spaHelper!.clearRefreshTokenTimeout();
    await this._spaHelper!.refreshAccessTokenAutomatically(() => this.refreshAccessToken() as any);

    return this.getUser();
  }

  public override async signInSilently(
    additionalParams?: Record<string, AuthorizeRequestParamValue>,
    tokenRequestConfig?: {params: Record<string, unknown>},
  ): Promise<User | boolean | undefined> {
    await this.isInitialized();

    if (SPAUtils.wasSignInCalled()) {
      return undefined;
    }

    const response = await this._signInSilentlyInternal(additionalParams, tokenRequestConfig);

    if (response) {
      void this._emitHook(Hooks.SignIn, response);
    }

    return response;
  }

  private async _signInSilentlyInternal(
    additionalParams?: Record<string, AuthorizeRequestParamValue>,
    tokenRequestConfig?: {params: Record<string, unknown>},
  ): Promise<User | boolean> {
    const {session} = await this.getStorageManager().getConfigData();

    return this._authHelper!.signInSilently(
      (params) => this._constructSilentSignInUrl(params),
      (code, s, trc) => this._exchangeCodeForTokens(code, s, trc),
      additionalParams,
      tokenRequestConfig,
      session?.silentSignIn?.timeout,
    );
  }

  public override async signOut(
    _options?: any,
    sessionIdOrAfterSignOut?: string | ((url: string) => void),
    afterSignOutParam?: (url: string) => void,
  ): Promise<string> {
    let afterSignOut: ((url: string) => void) | undefined;
    let sessionId: string | undefined;

    if (typeof sessionIdOrAfterSignOut === 'function') {
      afterSignOut = sessionIdOrAfterSignOut;
    } else if (typeof sessionIdOrAfterSignOut === 'string') {
      sessionId = sessionIdOrAfterSignOut;
      afterSignOut = afterSignOutParam;
    }

    const sm = this.getStorageManager();
    const config = await (sm as any).getConfigData();

    // OIDC RP-Initiated Logout: end the session at the OP's end_session_endpoint. The sign-out URL
    // (carrying id_token_hint/client_id + post_logout_redirect_uri) is resolved before the access
    // token is revoked or the local session is cleared, so the ID token used for the hint is still
    // available. This is the default; it falls back to a local-only sign out when no
    // end_session_endpoint is advertised or the URL cannot be built. Set rpInitiatedLogout: false to
    // force a local-only sign out.
    let signOutUrl = '';

    if (config?.rpInitiatedLogout !== false) {
      // A cached URL is stored per client at token exchange; when a specific session is targeted, build
      // a fresh URL instead so the id_token_hint matches that session.
      signOutUrl = sessionId ? '' : SPAUtils.getSignOutUrl(config.clientId, this._browserInstanceId);

      if (!signOutUrl) {
        try {
          signOutUrl = await this.getSignOutUrl(sessionId);
        } catch (error) {
          // end_session_endpoint absent or ID token unavailable — fall through to local sign out.
          logger.debug('Could not build the RP-initiated logout URL; falling back to a local sign out.', error);
          signOutUrl = '';
        }
      }
    }

    // Revoke the access token at the OP before clearing the session. Disabled by default; set
    // tokenLifecycle.revokeToken.revokeOnSignOut to true to enable. Best-effort: revocation can
    // fail (no revocation_endpoint advertised, network error, non-200 response, or a stalled request)
    // without blocking sign out, since the local session must be cleared regardless. Uses the
    // request-only core method so the session (and the ID token read above) isn't cleared twice or
    // ahead of the RP-Initiated Logout URL resolution.
    if (config?.tokenLifecycle?.revokeToken?.revokeOnSignOut === true) {
      try {
        await this.requestAccessTokenRevocation(sessionId);
      } catch (error) {
        logger.debug('Could not revoke the access token before signing out.', error);
      }
    }

    if (signOutUrl) {
      // Await the clear so local tokens are gone before navigating away; clearSession() is otherwise
      // fire-and-forget and could be cut short by the redirect.
      await this.clearSessionAsync(sessionId);
      // Notify the caller before navigating away, mirroring the local-only path below.
      afterSignOut?.(signOutUrl);
      location.href = signOutUrl;
      await SPAUtils.waitTillPageRedirect();

      return signOutUrl;
    }

    // Local-only sign out: clear the session and navigate back to sign-in. Used when RP-initiated
    // logout is disabled, or as a fallback when the OP advertises no end_session_endpoint.
    this.clearSession(sessionId);

    if (config?.signInUrl) {
      navigate(config.signInUrl);
    } else {
      this.signIn(config?.signInOptions);
    }

    afterSignOut?.(config?.afterSignOutUrl || '');

    return config?.afterSignOutUrl || '';
  }

  public async httpRequest(requestConfig: HttpRequestConfig): Promise<HttpResponse | undefined> {
    await this._validateMethod(false);

    const response: HttpResponse = await this._authHelper!.httpRequest(
      this._httpClient!,
      requestConfig,
      this._isHttpHandlerEnabled,
      this._emitHttpError,
      this._emitHttpFinish,
    );

    if (this._isHttpHandlerEnabled) {
      this._emitHttpFinish();
    }

    return response;
  }

  public async httpRequestAll(configs: HttpRequestConfig[]): Promise<HttpResponse[] | undefined> {
    await this._validateMethod(false);

    const responses: HttpResponse[] | undefined = await this._authHelper!.httpRequestAll(
      configs,
      this._httpClient!,
      this._isHttpHandlerEnabled,
      this._emitHttpError,
      this._emitHttpFinish,
    );

    if (this._isHttpHandlerEnabled) {
      this._emitHttpFinish();
    }

    return responses;
  }

  public override async getUser(userId?: string): Promise<User> {
    await this._validateMethod();

    return super.getUser(userId);
  }

  /**
   * Fetches the signed-in user's profile from the `/users/me` endpoint (or `endpoints.usersMe` when
   * configured), sending the request through the client's HTTP client so the access token is attached.
   *
   * @param options - Optional `baseUrl` or full `url` overrides for the profile endpoint.
   * @returns The user's profile.
   */
  public override async getUserProfile(options?: {baseUrl?: string; url?: string}): Promise<UserProfile> {
    await this._validateMethod();

    const configData = await this.getStorageManager().getConfigData();
    const profile: User = await getUsersMe({
      baseUrl: options?.baseUrl ?? (configData as any)?.baseUrl,
      fetcher: createHttpClientFetcher(this._browserInstanceId),
      url: resolveResourceEndpoint('usersMe', configData as any, options?.url),
    });

    return {
      flattenedProfile: generateFlattenedUserProfile(profile),
      profile,
    };
  }

  public override async getAccessToken(sessionId?: string): Promise<string> {
    return super.getAccessToken(sessionId);
  }

  public override async getDecodedIdToken(userId?: string, idToken?: string): Promise<IdToken> {
    await this._validateMethod();

    return super.getDecodedIdToken(userId, idToken);
  }

  public override async getIdToken(userId?: string): Promise<string> {
    await this._validateMethod();

    return super.getIdToken(userId);
  }

  public override async getOpenIDProviderEndpoints(): Promise<Partial<OIDCEndpoints>> {
    await this.isInitialized();

    return super.getOpenIDProviderEndpoints();
  }

  public async getCrypto(): Promise<IsomorphicCrypto | undefined> {
    await this._validateMethod();

    return this.getCryptoHelper() as any;
  }

  public getHttpClient(): FetchHttpClient {
    if (!this._httpClient) {
      throw new ThunderIDAuthException(
        'SPA-AUTH_CLIENT-GHC-NF02',
        'The SDK is not initialized.',
        'Call initialize() before getHttpClient().',
      );
    }

    return this._httpClient;
  }

  public override async isSignedIn(userId?: string): Promise<boolean> {
    await this.isInitialized();

    return super.isSignedIn(userId);
  }

  protected notifySignIn(user: User): void {
    void this._emitHook(Hooks.SignIn, user);
  }

  public async isSessionActive(): Promise<boolean | undefined> {
    await this.isInitialized();

    return (await (this.getStorageManager() as any).getSessionStatus()) === 'true';
  }

  public override async refreshAccessToken(userId?: string): Promise<User | TokenResponse> {
    await this._validateMethod(false);

    try {
      return await this._authHelper!.refreshAccessToken((cfg) => this._enableRetrievingSignOutURLFromSession(cfg));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public override async revokeAccessToken(userId?: string): Promise<boolean | Response> {
    await this._validateMethod();

    const timer: number = await this._spaHelper!.getRefreshTimeoutTimer();
    await super.revokeAccessToken(userId);

    await this._spaHelper!.clearRefreshTokenTimeout(timer);

    await this._emitHook(Hooks.RevokeAccessToken, true);

    return true;
  }

  public override async exchangeToken(config: SPATokenExchangeConfig): Promise<Response | User> {
    if (config.signInRequired) {
      await this._validateMethod();
    }

    if (!config.id) {
      return Promise.reject(
        new ThunderIDAuthException(
          'SPA-AUTH_CLIENT-RCG-NF01',
          'The custom grant request id not found.',
          'Set the `id` attribute on the token exchange config.',
        ),
      );
    }

    const response = await this._authHelper!.exchangeToken(config, (cfg) =>
      this._enableRetrievingSignOutURLFromSession(cfg),
    );

    void this._emitHook(`${Hooks.CustomGrant}:${config.id}`, response);

    return response;
  }

  public override async reInitialize(config: Partial<T>): Promise<boolean> {
    await this.isInitialized();

    return super.reInitialize(config);
  }

  public async startAutoRefreshToken(): Promise<void> {
    await this.isInitialized();

    await this._spaHelper!.clearRefreshTokenTimeout();
    await this._spaHelper!.refreshAccessTokenAutomatically(() => this.refreshAccessToken() as any);
  }

  public async enableHttpHandler(): Promise<boolean | undefined> {
    await this.isInitialized();

    this._authHelper?.enableHttpHandler(this._httpClient!);
    this._isHttpHandlerEnabled = true;

    return true;
  }

  public async disableHttpHandler(): Promise<boolean | undefined> {
    await this.isInitialized();

    this._authHelper?.disableHttpHandler(this._httpClient!);
    this._isHttpHandlerEnabled = false;

    return true;
  }

  public override async decodeJwtToken<R = Record<string, unknown>>(token: string): Promise<R> {
    return this.getCryptoHelper().decodeJwtToken<R>(token);
  }

  /**
   * Subscribes a callback to a lifecycle hook. Every callback registered for a hook is called when it
   * fires; registering the same callback again for the same hook has no further effect. Hooks can be
   * registered before or after `initialize()`.
   *
   * @param hook - The hook to subscribe to (see `Hooks`).
   * @param callback - Called when the hook fires.
   * @param id - The custom grant id. Required for `custom-grant`.
   */
  public async on(hook: string, callback: (response?: any) => void | Promise<void>, id?: string): Promise<void> {
    await this.isInitialized();

    if (!callback || typeof callback !== 'function') {
      throw new ThunderIDAuthException(
        'SPA-AUTH_CLIENT-ON-IV02',
        'Invalid callback function.',
        'The provided callback must be a function.',
      );
    }

    switch (hook as Hooks) {
      case Hooks.SignIn:
      case Hooks.RevokeAccessToken:
      case Hooks.Initialize:
      case Hooks.HttpRequestError:
      case Hooks.HttpRequestFinish:
      case Hooks.HttpRequestStart:
      case Hooks.HttpRequestSuccess:
        this._addHookCallback(hook, callback);
        break;
      case Hooks.SignOut:
        if (
          await SPAUtils.isSignOutSuccessful(
            ThunderIDBrowserClient.isSignOutSuccessful.bind(ThunderIDBrowserClient),
            () => ThunderIDBrowserClient.clearSession(),
          )
        ) {
          void callback();
        }
        break;
      case Hooks.CustomGrant:
        id && this._addHookCallback(`${Hooks.CustomGrant}:${id}`, callback);
        break;
      case Hooks.SignOutFailed: {
        const signOutFail = SPAUtils.didSignOutFail(ThunderIDBrowserClient.didSignOutFail.bind(ThunderIDBrowserClient));
        if (signOutFail) {
          void callback(signOutFail as SignOutError);
        }
        break;
      }
      default:
        throw new ThunderIDAuthException('SPA-AUTH_CLIENT-ON-IV01', 'Invalid hook.', `Unknown hook: "${hook}"`);
    }
  }

  private _addHookCallback(hook: string, callback: HookCallback): void {
    const callbacks: Set<HookCallback> = this._hookCallbacks.get(hook) ?? new Set<HookCallback>();

    callbacks.add(callback);
    this._hookCallbacks.set(hook, callbacks);
  }

  private _emitHook(hook: string, response?: unknown): Promise<unknown[]> {
    return Promise.all(
      [...(this._hookCallbacks.get(hook) ?? [])].map((callback: HookCallback) => Promise.resolve(callback(response))),
    );
  }

  private _emitHttpError = async (error: HttpError): Promise<void> => {
    await this._emitHook(Hooks.HttpRequestError, error);
  };

  private _emitHttpFinish = (): void => {
    void this._emitHook(Hooks.HttpRequestFinish);
  };

  private _enableRetrievingSignOutURLFromSession(config: SPATokenExchangeConfig): void {
    if (config.preventSignOutURLUpdate) {
      this._getSignOutURLFromSessionStorage = true;
    }
  }

  private async _constructSilentSignInUrl(
    additionalParams: Record<string, AuthorizeRequestParamValue> = {},
  ): Promise<string> {
    const sm = this.getStorageManager();
    const config = await (sm as any).getConfigData();

    const urlString: string = await this.getSignInUrl({
      prompt: 'none',
      state: SILENT_SIGN_IN_STATE,
      ...additionalParams,
    } as any);

    const urlObject = new URL(urlString);
    urlObject.searchParams.set('response_mode', 'query');

    if (this._storage === BrowserStorage.BrowserMemory && config.enablePKCE) {
      const state = urlObject.searchParams.get(OIDCRequestConstants.Params.STATE);
      SPAUtils.setPKCE(extractPkceStorageKeyFromState(state ?? ''), await this.getPKCECode(state ?? ''));
    }

    return urlObject.toString();
  }

  public override getInstanceId(): number {
    return this._browserInstanceId;
  }

  public static async clearSession(): Promise<void> {
    // Static clear: no-op at base level; session data is cleared by instance signOut
  }
}

export default ThunderIDBrowserClient;
