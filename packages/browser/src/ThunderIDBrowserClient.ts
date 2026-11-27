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
  BackendEndpointConfig,
  ResolvedBackendEndpoints,
  SessionData,
  TokenConstants,
  createPackageComponentLogger,
  generateFlattenedUserProfile,
  getTokenPermissions,
  getUsersMe,
  resolveRequestBaseUrl,
  resolveBackendEndpoints,
  resolveResourceEndpoint,
  AuthClientConfig,
  StorageManager,
  DeviceSecretSwitchResult,
  EmbeddedFlowSessionData,
  EmbeddedFlowType,
  EmbeddedSignInFlowRequest,
  EmbeddedSignInFlowResponse,
  EmbeddedSignInFlowStatus,
  OrganizationUnitSwitchErrorCodes,
  OrganizationUnitSwitchFallbackErrors,
  SwitchOrganizationUnitOptions,
  ThunderIDAPIError,
  ThunderIDRuntimeError,
  ReauthenticationMethod,
  ReauthenticationOptions,
  ReauthenticationRequest,
  executeEmbeddedSignInFlow,
  Telemetry,
  TelemetryConfig,
  HttpRequestOutcome,
  TELEMETRY_EVENT_HEADER,
} from '@thunderid/javascript';
import BackendClient from './BackendClient';
import BackendHttpClient from './BackendHttpClient';
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
import BrowserTelemetry from './telemetry/BrowserTelemetry';
import AuthenticationHelper from './utils/AuthenticationHelper';
import createHttpClientFetcher from './utils/createHttpClientFetcher';
import navigate from './utils/navigate';
import {
  completeReauthenticationInPopup,
  isReauthenticationPopup,
  openReauthenticationPopup,
  ReauthenticationMessage,
  waitForReauthentication,
} from './utils/reauthenticationPopup';
import SPACryptoUtils from './utils/SPACryptoUtils';
import SPAHelper from './utils/SPAHelper';
import SPAUtils from './utils/SPAUtils';

/**
 * Temporary-data key that marks a switch to another organization unit left the page, so its callback is
 * redeemed although the previous session is still signed in.
 */
const ORGANIZATION_UNIT_SWITCH_KEY = 'organization_unit_switch';

/**
 * How long a sign-out waits for its telemetry to be sent before it goes on.
 */
const SIGN_OUT_TELEMETRY_WAIT_MS = 1000;

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
  private _backend: BackendClient | undefined;
  private _stopBackendWatch: (() => void) | undefined;
  private _backendTokenRequest: Promise<string> | undefined;
  private _telemetry: BrowserTelemetry | undefined;
  private _telemetrySignIn: HookCallback | undefined;
  private _signOutReported = false;

  public constructor(instanceId = 0) {
    super(undefined, new SPACryptoUtils());
    this._browserInstanceId = instanceId;
  }

  public override async initialize(config: T, storage?: Storage): Promise<boolean> {
    // A re-sign-in popup's callback belongs to the window that opened it, so it is handed over before
    // anything treats it as a sign-in callback, and the popup's SDK does nothing more.
    if (completeReauthenticationInPopup()) {
      return false;
    }

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

    try {
      await super.initialize(merged as unknown as T, store);
    } catch (error) {
      // A refused configuration leaves the client uninitialized, so later calls fail instead of waiting.
      this._startedInitialize = false;

      throw error;
    }

    const sm = this.getStorageManager();
    this._spaHelper = new SPAHelper<T>(sm);

    const attachToken = async (request: HttpRequestConfig): Promise<void> => {
      await this._authHelper?.attachTokenToRequestConfig(request);
    };

    const backendEndpoints: ResolvedBackendEndpoints | undefined = resolveBackendEndpoints(
      merged as BackendEndpointConfig,
      window.location.origin,
    );

    if (backendEndpoints) {
      // The backend holds the tokens, so requests carry the session cookie instead of a token. A
      // repeated initialization with the same endpoints, as React's strict mode does in development,
      // keeps the client and its session read.
      if (!this._backend?.hasEndpoints(backendEndpoints)) {
        this._backend = new BackendClient(backendEndpoints);
        // A session that ends elsewhere, such as a sign-out in another app, signs the app out too.
        this._backend.onSignedOut(() => {
          this._telemetry?.auth('session-expired');
          void this.getStorageManager().removeSessionData();
          void this._emitHook(Hooks.SignOut);
        });
      }
      // Poll the backend every `session.checkInterval` seconds. Checks on focus run either way.
      this._stopBackendWatch?.();
      const {session} = merged as {session?: SessionConfig};
      this._stopBackendWatch = this._backend.watch(Number(session?.checkInterval ?? 0));
      this._httpClient = new BackendHttpClient(this._backend, (renew: boolean) => this._getBackendAccessToken(renew));
      FetchHttpClient.setInstance(this._browserInstanceId, this._httpClient);
      // Read the session now, so the client reports loading until it is known whether the user is
      // signed in. Route guards otherwise see "not loading, not signed in" and start a sign-in.
      this._backend.getSession().catch((error: unknown) => {
        logger.debug('Could not read the backend session.', error);
      });
    } else {
      this._stopBackendWatch?.();
      this._stopBackendWatch = undefined;
      this._backend = undefined;
      this._httpClient = FetchHttpClient.getInstance(this._browserInstanceId, true, attachToken);
    }

    this._httpClient.setHttpRequestStartCallback((request: HttpRequestConfig) => {
      void this._emitHook(Hooks.HttpRequestStart, request);
    });
    this._httpClient.setHttpRequestSuccessCallback((response: HttpResponse) => {
      void this._emitHook(Hooks.HttpRequestSuccess, response);
    });

    const {baseUrl, telemetry, vendor} = merged as {baseUrl?: string; telemetry?: TelemetryConfig; vendor?: string};
    this._startTelemetry(telemetry, baseUrl, vendor);

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
        this._telemetry?.auth('session-expired');
        this._signOutReported = true;
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
      // A failed initialization ends the wait.
      if (!this._startedInitialize) {
        return false;
      }

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
    return this._backend?.isLoading() ?? false;
  }

  /**
   * Whether sign-in runs on the app's backend, which holds the tokens so the browser never does.
   */
  public isBackendMode(): boolean {
    return this._backend !== undefined;
  }

  private _rejectInBackendMode<R>(operation: string): Promise<R> {
    return Promise.reject(
      new ThunderIDAuthException(
        'SPA-AUTH_CLIENT-BACKEND-NS01',
        'Not supported when sign-in runs on the backend.',
        `${operation} is not available when sign-in runs on the backend, because the browser holds no tokens.`,
      ),
    );
  }

  public override async signIn(
    config?: SignInConfig,
    authorizationCode?: string,
    state?: string,
    tokenRequestConfig?: {params: Record<string, unknown>},
  ): Promise<User | undefined> {
    // In a re-sign-in popup the code belongs to the opener, which redeems it.
    if (isReauthenticationPopup()) {
      return undefined;
    }

    await this.isInitialized();

    if (this._backend) {
      if (config?.callOnlyOnRedirect) {
        return undefined;
      }

      const backendOuId: unknown = (config as Record<string, unknown> | undefined)?.['organizationUnitId'];

      location.href = this._backend.getSignInUrl(
        `${window.location.pathname}${window.location.search}`,
        typeof backendOuId === 'string' && backendOuId !== '' ? backendOuId : undefined,
      );
      await SPAUtils.waitTillPageRedirect();

      return undefined;
    }

    if (!SPAUtils.canContinueSignIn(Boolean(config?.callOnlyOnRedirect), authorizationCode)) {
      return undefined;
    }

    delete config?.callOnlyOnRedirect;

    // Read before the sign-in consumes it: the return from an organization switch is not a sign-in, so
    // its failure is not a failed sign-in.
    const returnParams: URLSearchParams = new URL(window.location.href).searchParams;
    const switching = Boolean(
      this._telemetry &&
        (returnParams.has(OIDCRequestConstants.Params.AUTHORIZATION_CODE) || returnParams.has('error')) &&
        (await this.getStorageManager().getTemporaryDataParameter(ORGANIZATION_UNIT_SWITCH_KEY)),
    );
    let user: User | undefined;
    try {
      user = await this._signInInternal(config, authorizationCode, state, tokenRequestConfig);
    } catch (error) {
      if (!switching) {
        const code: unknown = (error as {code?: unknown} | undefined)?.code;
        this._telemetry?.auth('sign-in-failed', typeof code === 'string' ? {error_code: code} : {});
      }
      throw error;
    }

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

    // The callback of a switch to another organization unit arrives while the previous session is still
    // signed in, so it is redeemed here rather than answered with that session.
    const switchedUser: User | undefined = await this._completeOrganizationUnitSwitch(tokenRequestConfig);

    if (switchedUser) {
      return switchedUser;
    }

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

    return this._startSession(config.clientId);
  }

  /**
   * Prepares the sign-out URL and the token refresh for tokens just stored, and reads the user.
   */
  private async _startSession(clientId: string): Promise<User> {
    try {
      const signOutUrl = await this.getSignOutUrl();
      SPAUtils.setSignOutURL(signOutUrl, clientId, this._browserInstanceId);
    } catch {
      // end_session_endpoint absent — signOut() falls back to signInUrl navigation.
    }

    await this._spaHelper!.clearRefreshTokenTimeout();
    await this._spaHelper!.refreshAccessTokenAutomatically(() => this.refreshAccessToken() as any);

    return this.getUser();
  }

  /**
   * Signs the signed-in user in again in a popup, for a change that needs a recent sign-in, such as
   * setting a first credential or changing an email address. Pass the `maxAge` of the
   * `StepUpRequiredError` the change failed with. The popup sends `max_age` (or `prompt=login`) and
   * `id_token_hint`; the code it returns is redeemed here, and the session's tokens are replaced only when
   * the ID token is valid, carries the request's nonce, and names the same user. Then retry the change
   * once. Call it from the user action, such as a click, so the browser lets the popup open.
   *
   * For a session from a redirect sign-in only: see {@link getReauthenticationMethod}. A session from an
   * embedded sign-in flow signs in again with {@link executeReauthenticationFlow}, and backend mode
   * through the backend's sign-in.
   *
   * @param options - How recent the sign-in must be.
   * @throws {ThunderIDRuntimeError} When the popup is blocked or closed, the sign-in fails, or it signs
   *   in a different user; the session is then left as it was.
   */
  public async reauthenticate(options: ReauthenticationOptions = {}): Promise<void> {
    if (this._backend) {
      throw new ThunderIDRuntimeError(
        'Signing in again in a popup is not available in backend mode.',
        'BROWSER-REAUTHENTICATION-UM01',
        'browser',
      );
    }

    // Opened before any await, so the browser treats it as part of the user action.
    const popup: Window = openReauthenticationPopup(this._browserInstanceId);
    let refreshPaused = false;

    try {
      await this.isInitialized();

      const config: AuthClientConfig<T> = await this.getStorageManager().getConfigData();

      if (await this._isFlowSession(config)) {
        throw new ThunderIDRuntimeError(
          'Signing in again in a popup is not available for a session from an embedded sign-in flow.',
          'BROWSER-REAUTHENTICATION-UM02',
          'browser',
        );
      }

      const authorization: ReauthenticationRequest = await this.buildReauthenticationRequest(
        options,
        config?.afterSignInUrl ?? window.location.origin,
      );

      popup.location.href = authorization.url;
      // A refresh while the user signs in again could store tokens with the old sign-in time over the new
      // ones, so the timer stops here and starts again below.
      await this._spaHelper?.clearRefreshTokenTimeout();
      refreshPaused = true;

      const message: ReauthenticationMessage = await waitForReauthentication(popup, authorization.state);

      if (message.error || !message.code) {
        throw new ThunderIDRuntimeError(
          message.errorDescription ?? message.error ?? 'The sign-in returned no authorization code.',
          'BROWSER-REAUTHENTICATION-AE01',
          'browser',
          {error: message.error},
        );
      }

      await this.completeReauthentication(authorization, message.code);
    } finally {
      if (refreshPaused) {
        await this._spaHelper?.refreshAccessTokenAutomatically((): Promise<unknown> => this.refreshAccessToken());
      }
      if (!popup.closed) {
        popup.close();
      }
    }
  }

  /**
   * How the signed-in user signs in again for a change that needs a recent sign-in: `popup` with
   * {@link reauthenticate} for a session from a redirect sign-in, `flow` with
   * {@link executeReauthenticationFlow} for a session from an embedded sign-in flow (or with `mode`
   * set to `embedded`), and `unavailable` in backend mode.
   *
   * @returns The method for the current session.
   */
  public async getReauthenticationMethod(): Promise<ReauthenticationMethod> {
    if (this._backend) {
      return 'unavailable';
    }

    await this.isInitialized();

    const config: AuthClientConfig<T> = await this.getStorageManager().getConfigData();

    return (await this._isFlowSession(config)) ? 'flow' : 'popup';
  }

  /**
   * Runs the sign-in flow again for the signed-in user, for a change that needs a recent sign-in, in a
   * session from an embedded sign-in flow. Call it without an `executionId` to start the flow: it starts
   * an `AUTHENTICATION` flow for the configured `applicationId` with `maxAge` (`0` when not given, so the
   * user is always asked), and the server asks the user again when the sign-in is older. Then call it with
   * each step's `executionId`, inputs and action, as `signIn` takes them, and render each response.
   *
   * When the flow completes, the session's tokens are replaced with its assertion only when it names the
   * same user (`sub`) as the session; otherwise the session is left as it was. Then retry the change once.
   *
   * @param payload - A step of the flow; empty to start it.
   * @param options - How recent the sign-in must be, read when starting.
   * @returns The flow's response.
   * @throws {ThunderIDRuntimeError} In backend mode (`BROWSER-REAUTHENTICATION-UM01`), without an
   *   `applicationId` (`BROWSER-REAUTHENTICATION-UM03`), or when a different user signed in
   *   (`BROWSER-REAUTHENTICATION-DU01`).
   */
  public async executeReauthenticationFlow(
    payload: EmbeddedSignInFlowRequest = {},
    options: ReauthenticationOptions = {},
  ): Promise<EmbeddedSignInFlowResponse> {
    if (this._backend) {
      throw new ThunderIDRuntimeError(
        'Signing in again with a sign-in flow is not available in backend mode.',
        'BROWSER-REAUTHENTICATION-UM01',
        'browser',
      );
    }

    await this.isInitialized();

    const config: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
    let request: EmbeddedSignInFlowRequest;

    if (payload.executionId) {
      const {action, challengeToken, executionId, inputs} = payload;

      request = {action, challengeToken, executionId, inputs};
    } else {
      const applicationId: string | undefined = (config as {applicationId?: string})?.applicationId;

      if (!applicationId) {
        throw new ThunderIDRuntimeError(
          'Signing in again with a sign-in flow needs the application ID.',
          'BROWSER-REAUTHENTICATION-UM03',
          'browser',
        );
      }

      const maxAge: number =
        options.maxAge !== undefined && Number.isFinite(options.maxAge) && options.maxAge >= 0
          ? Math.floor(options.maxAge)
          : 0;
      // The kept session handles let the server read the sign-in time where its cookie is not sent.
      const sessionData: EmbeddedFlowSessionData[] = await this.getFlowSessions();

      request = {
        applicationId,
        flowType: EmbeddedFlowType.Authentication,
        maxAge,
        ...(config?.scopes ? {scopes: config.scopes} : {}),
        ...(sessionData.length > 0 ? {sessionData} : {}),
      };
    }

    const response: EmbeddedSignInFlowResponse = await executeEmbeddedSignInFlow({
      baseUrl: config?.baseUrl,
      payload: request,
      url: resolveResourceEndpoint('flowExecute', config),
    });

    if (response?.flowStatus !== EmbeddedSignInFlowStatus.Complete || !response.assertion) {
      await this.storeFlowSessions(response ?? {});

      return response;
    }

    const claims: Record<string, unknown> = await this.decodeJwtToken<Record<string, unknown>>(response.assertion);
    const idToken: string | undefined = (await this.getStorageManager().getSessionData())?.id_token;
    const sessionSubject: unknown = idToken
      ? (await this.decodeJwtToken<Record<string, unknown>>(idToken))['sub']
      : undefined;

    if (!sessionSubject || claims['sub'] !== sessionSubject) {
      throw new ThunderIDRuntimeError(
        'The sign-in used a different account than the signed-in user.',
        'BROWSER-REAUTHENTICATION-DU01',
        'browser',
      );
    }

    await this.storeFlowSessions(response);
    await this.setSessionFromFlowAssertion({...response, assertion: response.assertion});

    return response;
  }

  /**
   * Whether the session came from an embedded sign-in flow, or the SDK is configured for embedded mode.
   */
  private async _isFlowSession(config: AuthClientConfig<T>): Promise<boolean> {
    if ((config as {mode?: string})?.mode === 'embedded') {
      return true;
    }

    const session: Partial<SessionData> | undefined = await this.getStorageManager().getSessionData();

    return Boolean(session?.embedded_sign_in);
  }

  /**
   * Signs in again bounded to the organization unit `organizationUnitId`, and replaces the session with
   * the one it gets. The server reuses the SSO session when the user can sign in there, so normally no
   * credentials are asked.
   *
   * - Redirect mode exchanges the session's device secret at `{baseUrl}/ou/{ouId}/oauth2/token` when it
   *   holds one, which a sign-in with the `device_sso` scope returns. Otherwise it tries a `prompt=none`
   *   request to `{baseUrl}/ou/{ouId}/oauth2/authorize` in a hidden iframe. When the server needs the
   *   user, it redirects the page there (unless `redirect` is `false`), and the callback replaces the
   *   session.
   * - Embedded mode starts an `AUTHENTICATION` flow with `ouId`, presenting the SSO session handles kept
   *   from earlier flow steps. A flow that needs input fails with `interaction_required`; render the
   *   sign-in for the unit instead.
   * - Backend mode sends `POST {ouSwitch}?ouId=` with `{"ouId"}` as a JSON body to the backend, which
   *   switches its session, then reads the session again, so the page stays where it is. When the
   *   backend needs the user, or answers `401`, it sends the page to the backend's sign-in endpoint
   *   with `ouId` (unless `redirect` is `false`). The extra parameters do not apply.
   *
   * A failed switch leaves the previous session as it was.
   *
   * @throws {ThunderIDAPIError} With a code from `OrganizationUnitSwitchErrorCodes`.
   */
  public override async switchOrganizationUnit(
    organizationUnitId: string,
    options: SwitchOrganizationUnitOptions = {},
  ): Promise<User | undefined> {
    await this.isInitialized();

    if (typeof organizationUnitId !== 'string' || organizationUnitId.trim() === '') {
      throw new ThunderIDAPIError(
        'An organization unit identifier is required.',
        OrganizationUnitSwitchErrorCodes.InvalidOrganizationUnit,
        'browser',
        400,
      );
    }

    if (this._backend) {
      return this._switchOrganizationUnitOnBackend(organizationUnitId, options.redirect !== false);
    }

    const {redirect = true, ...params} = options;
    const sm: StorageManager<T> = this.getStorageManager();
    const config: AuthClientConfig<T> = await sm.getConfigData();

    if ((config as {mode?: string})?.mode === 'embedded') {
      return this._switchOrganizationUnitEmbedded(organizationUnitId, config);
    }

    const exchangedUser: User | false | undefined = await this._switchOrganizationUnitWithDeviceSecret(
      organizationUnitId,
      config,
    );

    if (exchangedUser) {
      return exchangedUser;
    }

    let silentError: string | undefined;
    let silentUser: User | boolean = false;

    // Without a device secret, the silent sign-in runs in an iframe on the session cookie.
    if (exchangedUser === undefined) {
      try {
        silentUser = await this._authHelper!.signInSilently(
          (additional: Record<string, AuthorizeRequestParamValue> | undefined) =>
            this._constructSilentSignInUrl(additional),
          (code: string, s: string, trc?: {params: Record<string, unknown>}) =>
            this._exchangeCodeForTokens(code, s, trc),
          {...(params as Record<string, AuthorizeRequestParamValue>), organizationUnitId},
          undefined,
          (config as BrowserAuthConfig | undefined)?.session?.silentSignIn?.timeout,
          (error?: string) => {
            silentError = error;
          },
        );
      } catch (error) {
        throw ThunderIDBrowserClient._toSwitchError(error instanceof Error ? error.message : undefined, error);
      }
    }

    if (silentUser && typeof silentUser === 'object') {
      void this._emitHook(Hooks.SignIn, silentUser);

      return silentUser;
    }

    if (silentError && !OrganizationUnitSwitchFallbackErrors.Interaction.includes(silentError)) {
      throw ThunderIDBrowserClient._toSwitchError(silentError);
    }

    if (!redirect) {
      throw ThunderIDBrowserClient._toSwitchError('interaction_required');
    }

    const url: string = await this.getSignInUrl({
      ...(params as Record<string, AuthorizeRequestParamValue>),
      organizationUnitId,
    });

    await sm.setTemporaryDataParameter(ORGANIZATION_UNIT_SWITCH_KEY, organizationUnitId);

    location.href = url;
    await SPAUtils.waitTillPageRedirect();

    return undefined;
  }

  /**
   * Backend mode: asks the backend's `ouSwitch` endpoint to switch, then reads its session again, so the
   * page stays where it is. When the backend needs the user, the page goes to the backend's sign-in for
   * the unit instead, unless `redirect` is off.
   */
  private async _switchOrganizationUnitOnBackend(
    organizationUnitId: string,
    redirect: boolean,
  ): Promise<User | undefined> {
    let refusal: {error?: string} | undefined;

    try {
      refusal = await this._backend!.switchOrganizationUnit(organizationUnitId);
    } catch (error) {
      throw ThunderIDBrowserClient._toSwitchError(undefined, error);
    }

    if (refusal) {
      if (!redirect || !refusal.error || !OrganizationUnitSwitchFallbackErrors.Interaction.includes(refusal.error)) {
        throw ThunderIDBrowserClient._toSwitchError(refusal.error);
      }

      location.href = this._backend!.getSignInUrl(
        `${window.location.pathname}${window.location.search}`,
        organizationUnitId,
      );
      await SPAUtils.waitTillPageRedirect();

      return undefined;
    }

    const user: User = await this.getUser();

    void this._emitHook(Hooks.SignIn, user);

    return user;
  }

  /**
   * Switches back-channel by exchanging the session's device secret at the unit's token endpoint.
   *
   * @returns The user, `false` when the server needs the user, or `undefined` when the session holds no
   *   device secret.
   */
  private async _switchOrganizationUnitWithDeviceSecret(
    organizationUnitId: string,
    config: AuthClientConfig<T>,
  ): Promise<User | false | undefined> {
    let result: DeviceSecretSwitchResult | undefined;

    try {
      result = await this.switchOrganizationUnitWithDeviceSecret(organizationUnitId);
    } catch (error) {
      throw ThunderIDBrowserClient._toSwitchError(undefined, error);
    }

    if (!result) {
      return undefined;
    }

    if ('error' in result) {
      // A device secret the server refused as unusable has been dropped, so the user signs in again.
      if (
        OrganizationUnitSwitchFallbackErrors.Interaction.includes(result.error) ||
        OrganizationUnitSwitchFallbackErrors.UnusableDeviceSecret.includes(result.error)
      ) {
        return false;
      }

      throw ThunderIDBrowserClient._toSwitchError(result.error);
    }

    const user: User = await this._startSession(config.clientId ?? '');

    void this._emitHook(Hooks.SignIn, user);

    return user;
  }

  /**
   * Maps an OAuth error from a bounded sign-in onto the switch's documented errors.
   */
  private static _toSwitchError(oauthError?: string, cause?: unknown): ThunderIDAPIError {
    if (
      cause instanceof ThunderIDAPIError &&
      (Object.values(OrganizationUnitSwitchErrorCodes) as string[]).includes(cause.code)
    ) {
      return cause;
    }

    let code: string = OrganizationUnitSwitchErrorCodes.Failed;

    if (oauthError === 'unauthorized_client') {
      code = OrganizationUnitSwitchErrorCodes.UnauthorizedClient;
    } else if (oauthError && OrganizationUnitSwitchFallbackErrors.Interaction.includes(oauthError)) {
      code = OrganizationUnitSwitchErrorCodes.InteractionRequired;
    }

    const serverCode: string = oauthError ?? 'switch_failed';

    return new ThunderIDAPIError(
      JSON.stringify({code: serverCode, message: {defaultValue: serverCode}}),
      code,
      'browser',
      oauthError === 'unauthorized_client' ? 400 : undefined,
      undefined,
      'Switching the organization unit failed',
    );
  }

  /**
   * Replaces the session with the result of a completed embedded flow: the access token its assertion
   * is exchanged for, with the assertion as the ID token. Only the kept SSO session handles carry over.
   * A failed exchange drops the handles the step returned, so a retry shows the flow again.
   *
   * @param step - The flow step whose `flowStatus` is `COMPLETE`.
   * @returns The assertion's claims.
   */
  protected async setSessionFromFlowAssertion(step: {
    assertion: string;
    sessionData?: EmbeddedFlowSessionData[];
  }): Promise<Record<string, unknown>> {
    let session: SessionData;

    try {
      session = await this.exchangeFlowAssertion(step.assertion);
    } catch (error) {
      const clearedSessions: string[] = (step.sessionData ?? []).map(
        ({flowIdentifier}: EmbeddedFlowSessionData) => flowIdentifier,
      );

      await this.storeFlowSessions({clearedSessions});

      throw error;
    }

    // The previous session's refresh would run against a session with no refresh token.
    await this._spaHelper?.clearRefreshTokenTimeout();

    const previous: Partial<SessionData> = (await this.getStorageManager().getSessionData()) ?? {};
    // Session writes merge and drop undefined keys, so every previous key is cleared in the same write.
    const cleared: Record<string, undefined> = Object.fromEntries(
      Object.keys(previous).map((key: string): [string, undefined] => [key, undefined]),
    );

    await this.setSession({...cleared, embedded_sign_in: true, flow_sessions: previous.flow_sessions, ...session});

    return this.decodeJwtToken<Record<string, unknown>>(step.assertion);
  }

  /**
   * Embedded mode: starts a sign-in flow bounded to the unit. When the SSO session is reused, the flow
   * completes at once and the token its assertion is exchanged for replaces the session.
   */
  private async _switchOrganizationUnitEmbedded(
    organizationUnitId: string,
    config: AuthClientConfig<T>,
  ): Promise<User> {
    let response: EmbeddedSignInFlowResponse;
    // The kept session handles let the server reuse the SSO session where its cookie is not sent.
    const sessionData: EmbeddedFlowSessionData[] = await this.getFlowSessions();

    try {
      response = await executeEmbeddedSignInFlow({
        baseUrl: config?.baseUrl,
        payload: {
          applicationId: config?.applicationId ?? '',
          flowType: EmbeddedFlowType.Authentication,
          ouId: organizationUnitId,
          ...(sessionData.length > 0 ? {sessionData} : {}),
        },
        url: resolveResourceEndpoint('flowExecute', config),
      });
    } catch (error) {
      const serverCode: string | undefined = error instanceof ThunderIDAPIError ? error.serverError?.code : undefined;

      // FES-1023: a unit the application is not accessible from, or one that does not exist.
      throw ThunderIDBrowserClient._toSwitchError(
        serverCode === 'FES-1023' ? 'unauthorized_client' : serverCode,
        error,
      );
    }

    await this.storeFlowSessions(response);

    if (response?.flowStatus === EmbeddedSignInFlowStatus.Complete && response.assertion) {
      try {
        await this.setSessionFromFlowAssertion({...response, assertion: response.assertion});
      } catch (error) {
        logger.error('Keeping the session of the organization unit failed.', error);

        throw ThunderIDBrowserClient._toSwitchError(undefined, error);
      }

      const user: User = await this.getUser();

      void this._emitHook(Hooks.SignIn, user);

      return user;
    }

    if (response?.flowStatus === EmbeddedSignInFlowStatus.Error) {
      throw ThunderIDBrowserClient._toSwitchError('access_denied');
    }

    throw ThunderIDBrowserClient._toSwitchError('interaction_required');
  }

  /**
   * Completes a switch that left the page for the unit's authorization endpoint: redeems the returned
   * code, or reports the returned error and keeps the previous session.
   */
  private async _completeOrganizationUnitSwitch(tokenRequestConfig?: {
    params: Record<string, unknown>;
  }): Promise<User | undefined> {
    const sm: StorageManager<T> = this.getStorageManager();
    const pending: unknown = await sm.getTemporaryDataParameter(ORGANIZATION_UNIT_SWITCH_KEY);

    // A silent sign-in response inside its iframe is relayed to the parent, never redeemed here.
    if (!pending || SPAUtils.isInitializedSilentSignIn()) {
      return undefined;
    }

    const url: URL = new URL(window.location.href);
    const code: string | null = url.searchParams.get(OIDCRequestConstants.Params.AUTHORIZATION_CODE);
    const state: string | null = url.searchParams.get(OIDCRequestConstants.Params.STATE);
    const error: string | null = url.searchParams.get('error');

    if (code && state) {
      await sm.removeTemporaryDataParameter(ORGANIZATION_UNIT_SWITCH_KEY);
      SPAUtils.removeAuthorizationCode();

      try {
        return await this._exchangeCodeForTokens(code, state, tokenRequestConfig);
      } catch (exchangeError) {
        throw ThunderIDBrowserClient._toSwitchError(undefined, exchangeError);
      }
    }

    if (error) {
      await sm.removeTemporaryDataParameter(ORGANIZATION_UNIT_SWITCH_KEY);
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      url.searchParams.delete(OIDCRequestConstants.Params.STATE);
      history.replaceState(null, document.title, url.toString());

      throw ThunderIDBrowserClient._toSwitchError(error);
    }

    return undefined;
  }

  public override async signInSilently(
    additionalParams?: Record<string, AuthorizeRequestParamValue>,
    tokenRequestConfig?: {params: Record<string, unknown>},
  ): Promise<User | boolean | undefined> {
    await this.isInitialized();

    if (this._backend) {
      return (await this.isSignedIn()) ? this.getUser() : false;
    }

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

    if (this._telemetry) {
      if (!this._signOutReported) {
        this._telemetry.auth('sign-out');
      }
      this._signOutReported = false;
      // Send it before the page leaves for the sign-out redirect, but never hold the sign-out up for
      // long: the send goes on in the background after the wait.
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        this._telemetry.flush(true),
        new Promise<void>((resolve: () => void) => {
          timer = setTimeout(resolve, SIGN_OUT_TELEMETRY_WAIT_MS);
        }),
      ]);
      clearTimeout(timer);
    }

    if (this._backend) {
      await this.getStorageManager().removeSessionData();
      const backendSignOutUrl: string = await this._backend.signOut();
      afterSignOut?.(backendSignOutUrl);
      location.href = backendSignOutUrl;
      await SPAUtils.waitTillPageRedirect();

      return backendSignOutUrl;
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

    if (this._backend) {
      return this._backendRequest(requestConfig);
    }

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

  /**
   * Reports an event the app names, for what is neither a page, an API call the SDK makes nor a link.
   * Does nothing unless telemetry is configured.
   *
   * @param name - The event's name, `<type>.<action>`; the configured prefix is added.
   * @param data - Codes about it. Never a name or anything a user typed.
   */
  public track(name: string, data?: Record<string, string>): void {
    this._telemetry?.track(name, data);
  }

  /**
   * Reports a page view from its matched route pattern, such as `/applications/:id`. Router
   * integrations call it on each navigation. Does nothing unless telemetry is configured.
   *
   * @param pattern - The route pattern, never the URL.
   */
  public trackPageView(pattern: string): void {
    this._telemetry?.page(pattern);
  }

  private _startTelemetry(config: TelemetryConfig | undefined, baseUrl: string | undefined, vendor?: string): void {
    const previous: BrowserTelemetry | undefined = this._telemetry;
    this._telemetry = undefined;
    this._httpClient?.setHttpRequestObserver(undefined);
    if (this._telemetrySignIn) {
      this._hookCallbacks.get(Hooks.SignIn)?.delete(this._telemetrySignIn);
      this._telemetrySignIn = undefined;
    }
    void previous?.dispose();

    if (!Telemetry.isEnabled(config)) {
      return;
    }

    try {
      this._telemetry = new BrowserTelemetry(config, {
        // Behind a backend, the app calls the API through its proxy; otherwise at the configured base URL.
        apiBases: this._backend ? this._backend.getApiBases() : baseUrl ? [baseUrl] : [],
        backend: Boolean(this._backend),
        getAccessToken: () => this.getAccessToken(),
        getClaims: async () =>
          (await this.isSignedIn()) ? ((await this.getDecodedIdToken()) as Record<string, unknown>) : undefined,
        vendor,
      });
    } catch (error) {
      logger.debug('Telemetry is off: its configuration could not be used.', error);
      return;
    }

    const telemetry: BrowserTelemetry = this._telemetry;
    this._telemetrySignIn = (): Promise<void> => telemetry.signedIn();
    this._addHookCallback(Hooks.SignIn, this._telemetrySignIn);
    // Behind a backend, a sign-in completes on the backend and no sign-in hook runs, so a signed-in
    // session is reported here; `signedIn` reports each sign-in session once.
    this._backend
      ?.getSession()
      .then((session: {isSignedIn: boolean}) => {
        if (session.isSignedIn && this._telemetry === telemetry) {
          void telemetry.signedIn();
        }
      })
      .catch(() => undefined);
    // Every call through the SDK's HTTP client, including the management hooks', ends here.
    this._httpClient?.setHttpRequestObserver((request: HttpRequestConfig, outcome: HttpRequestOutcome) => {
      // A client replaced by a later initialization may still finish a request; only the current
      // telemetry reports it.
      if (this._telemetry !== telemetry) {
        return;
      }
      // Only the API's own name for the call is read from the response; never its body.
      const headers: Record<string, string> | undefined = outcome.ok
        ? outcome.headers
        : outcome.error?.response?.headers;
      const event: string | undefined = Object.entries(headers ?? {}).find(
        ([key]: [string, string]) => key.toLowerCase() === TELEMETRY_EVENT_HEADER,
      )?.[1];
      telemetry.api(
        request.method,
        request.url,
        request.data,
        outcome.ok
          ? {event, ok: true}
          : {event, ok: false, responseBody: outcome.error?.response?.data, status: outcome.error?.response?.status},
      );
    });
  }

  public async httpRequestAll(configs: HttpRequestConfig[]): Promise<HttpResponse[] | undefined> {
    await this._validateMethod(false);

    if (this._backend) {
      return Promise.all(configs.map((requestConfig: HttpRequestConfig) => this._backendRequest(requestConfig)));
    }

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

  private async _backendRequest(requestConfig: HttpRequestConfig): Promise<HttpResponse> {
    try {
      return await this._httpClient!.request(requestConfig);
    } catch (error) {
      if (this._isHttpHandlerEnabled) {
        await this._emitHttpError(error as HttpError);
      }

      throw error;
    } finally {
      if (this._isHttpHandlerEnabled) {
        this._emitHttpFinish();
      }
    }
  }

  public override async getUser(userId?: string): Promise<User> {
    await this._validateMethod();

    if (this._backend) {
      return ((await this._backend.getSession()).user ?? {}) as User;
    }

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
      // In backend mode the API is reached through the backend's proxy.
      baseUrl: options?.baseUrl ?? resolveRequestBaseUrl(configData as any),
      fetcher: createHttpClientFetcher(this._browserInstanceId),
      url: resolveResourceEndpoint('usersMe', configData as any, options?.url),
    });

    return {
      flattenedProfile: generateFlattenedUserProfile(profile),
      profile,
    };
  }

  public override async getAccessToken(sessionId?: string): Promise<string> {
    if (this._backend) {
      return this._getBackendAccessToken();
    }

    return super.getAccessToken(sessionId);
  }

  /**
   * The permissions the signed-in user's access token grants, for example to hide a page the user
   * cannot use. The server still checks every request.
   *
   * In backend mode they come only from the backend's session (`scope`): the token stays on the backend,
   * so a session without `scope` grants nothing. Otherwise they are read from the access token's `scope`
   * or `scopes` claim.
   *
   * @returns The granted permissions, or an empty list when none can be read.
   */
  public async getGrantedPermissions(): Promise<string[]> {
    if (this._backend) {
      const {scope} = await this._backend.getSession();

      return typeof scope === 'string' ? scope.split(' ').filter((entry: string) => entry.length > 0) : [];
    }

    return getTokenPermissions(await this.getAccessToken());
  }

  /**
   * The access token for requests under `endpoints.backend.bypass`. Like a client credentials token it
   * has no refresh token: it is kept in the session storage until it nears expiry, then requested again.
   *
   * @param renew - Request a new token even when the stored one is still valid.
   */
  private async _getBackendAccessToken(renew = false): Promise<string> {
    const storageManager = this.getStorageManager();
    const session: Partial<SessionData> | undefined = await storageManager.getSessionData();
    const expiresAt: number = (session?.created_at ?? 0) + Number(session?.expires_in ?? 0) * 1000;

    if (
      !renew &&
      session?.access_token &&
      expiresAt - TokenConstants.Lifecycle.CLIENT_CREDENTIALS_REFRESH_MARGIN_MS > Date.now()
    ) {
      return session.access_token;
    }

    this._backendTokenRequest ??= this._backend!.requestAccessToken()
      .then(async (response: Partial<SessionData>) => {
        await storageManager.setSessionData({...response, created_at: Date.now()});

        return response.access_token ?? '';
      })
      .finally(() => {
        this._backendTokenRequest = undefined;
      });

    return this._backendTokenRequest;
  }

  public override async getDecodedIdToken(userId?: string, idToken?: string): Promise<IdToken> {
    await this._validateMethod();

    if (this._backend) {
      // The backend keeps the ID token and returns its user claims, which is what callers read from it.
      return ((await this._backend.getSession()).user ?? {}) as IdToken;
    }

    return super.getDecodedIdToken(userId, idToken);
  }

  public override async getIdToken(userId?: string): Promise<string> {
    if (this._backend) {
      return this._rejectInBackendMode('getIdToken');
    }

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

    if (this._backend) {
      return (await this._backend.getSession()).isSignedIn;
    }

    return super.isSignedIn(userId);
  }

  protected notifySignIn(user: User): void {
    void this._emitHook(Hooks.SignIn, user);
  }

  /**
   * Reports a sign-in that the SDK's own embedded flow ended with an error. Only a well-formed error code
   * is sent, never the message.
   *
   * @param code - The flow's error code, if any.
   */
  protected notifySignInFailed(code: unknown): void {
    this._telemetry?.auth('sign-in-failed', Telemetry.signInFailureData(code));
  }

  public async isSessionActive(): Promise<boolean | undefined> {
    await this.isInitialized();

    if (this._backend) {
      return this.isSignedIn();
    }

    return (await (this.getStorageManager() as any).getSessionStatus()) === 'true';
  }

  public override async refreshAccessToken(userId?: string): Promise<User | TokenResponse> {
    await this._validateMethod(false);

    if (this._backend) {
      if (!(await this._backend.refresh())) {
        return Promise.reject(
          new ThunderIDAuthException(
            'SPA-AUTH_CLIENT-BACKEND-RF01',
            'Refresh failed.',
            'The backend could not refresh the session.',
          ),
        );
      }

      return this.getUser();
    }

    try {
      return await this._authHelper!.refreshAccessToken((cfg) => this._enableRetrievingSignOutURLFromSession(cfg));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public override async revokeAccessToken(userId?: string): Promise<boolean | Response> {
    if (this._backend) {
      return this._rejectInBackendMode('revokeAccessToken');
    }

    await this._validateMethod();

    const timer: number = await this._spaHelper!.getRefreshTimeoutTimer();
    await super.revokeAccessToken(userId);

    await this._spaHelper!.clearRefreshTokenTimeout(timer);

    await this._emitHook(Hooks.RevokeAccessToken, true);

    return true;
  }

  public override async exchangeToken(config: SPATokenExchangeConfig): Promise<Response | User> {
    if (this._backend) {
      return this._rejectInBackendMode('exchangeToken');
    }

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

    if (this._backend) {
      // The backend refreshes on demand: a request that finds the session expired refreshes it once.
      return;
    }

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
        // The hook fires on the way back from a sign-out redirect, and later whenever the session
        // ends without this app signing out, which only the backend can report.
        this._addHookCallback(hook, callback);
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
      // eslint-disable-next-line camelcase
      response_mode: 'query',
      state: SILENT_SIGN_IN_STATE,
      ...additionalParams,
    } as any);

    const urlObject = new URL(urlString);
    // A pushed request carries its parameters server-side, and its URL takes no others.
    const isPushed: boolean = urlObject.searchParams.has('request_uri');

    if (!isPushed) {
      urlObject.searchParams.set('response_mode', 'query');
    }

    if (this._storage === BrowserStorage.BrowserMemory && config.enablePKCE) {
      const state = urlObject.searchParams.get(OIDCRequestConstants.Params.STATE) ?? this.lastAuthorizeRequestState;
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
