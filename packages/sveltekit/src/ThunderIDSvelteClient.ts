import {
  ThunderIDBrowserClient,
  type AuthClientConfig,
  type BrandingPreference,
  type GetBrandingPreferenceConfig,
  type IdToken,
  type SPATokenExchangeConfig,
  type Storage,
  type StorageManager,
  type TokenResponse,
  type UpdateMeProfileConfig,
  type User,
  type UserProfile,
  getBrandingPreference,
  updateMeProfile,
} from '@thunderid/browser';
import {emit, on, off, clearListeners, SDKEvent} from './events/EventBus';
import type {SDKEventListener} from './events/EventBus';
import {IAMError, ErrorCode} from './errors/IAMError';
import {getLogger, type LoggerAdapter} from './logger/LoggerAdapter';
import {verifyIdToken, type IdTokenValidationResult} from './validation/IdTokenValidator';
import {DefaultHTTPAdapter, type HTTPAdapter, type HTTPResponse} from './adapters/HTTPAdapter';
import type {ThunderIDSvelteKitConfig} from './models/config';

class ThunderIDSvelteClient extends ThunderIDBrowserClient<AuthClientConfig<ThunderIDSvelteKitConfig>> {
  private static instance: ThunderIDSvelteClient;

  private _clientInitialized = false;
  private _isLoading = false;
  private logger: LoggerAdapter = getLogger();
  private httpAdapter?: HTTPAdapter;

  private constructor() {
    super();
  }

  public static getInstance(): ThunderIDSvelteClient {
    if (!ThunderIDSvelteClient.instance) {
      ThunderIDSvelteClient.instance = new ThunderIDSvelteClient();
    }
    return ThunderIDSvelteClient.instance;
  }

  override async isInitialized(): Promise<boolean> {
    return this._clientInitialized;
  }

  override async initialize(config: ThunderIDSvelteKitConfig, storage?: Storage): Promise<boolean> {
    if (this._clientInitialized) {
      throw new IAMError({
        code: ErrorCode.ALREADY_INITIALIZED,
        message: 'ThunderID SDK is already initialized. Call reset() first if you need to re-initialize.',
      });
    }

    if (!config.baseUrl) {
      throw new IAMError({
        code: ErrorCode.INVALID_CONFIGURATION,
        message: 'baseUrl is required. Set THUNDERID_BASE_URL environment variable or pass it in the config.',
      });
    }

    if (!config.baseUrl.startsWith('https://')) {
      throw new IAMError({
        code: ErrorCode.INVALID_CONFIGURATION,
        message: 'baseUrl must use HTTPS.',
      });
    }

    if (!config.clientId) {
      throw new IAMError({
        code: ErrorCode.INVALID_CONFIGURATION,
        message: 'clientId is required. Set THUNDERID_CLIENT_ID environment variable or pass it in the config.',
      });
    }

    const authConfig: AuthClientConfig<ThunderIDSvelteKitConfig> = {
      afterSignInUrl: config.afterSignInUrl ?? '/',
      afterSignOutUrl: config.afterSignOutUrl ?? '/',
      allowedExternalUrls: config.allowedExternalUrls,
      applicationId: config.applicationId,
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret ?? undefined,
      discovery: config.discovery,
      enablePKCE: true,
      endpoints: {
        ...(config.discovery?.wellKnown?.enabled !== false
          ? {wellKnown: `${config.baseUrl}/.well-known/openid-configuration`}
          : {}),
        ...(config.endpoints ?? {}),
      } as any,
      instanceId: config.instanceId,
      mode: config.mode,

      platform: config.platform,
      preferences: config.preferences,
      prompt: config.prompt,
      responseMode: config.responseMode,
      scopes: config.scopes ?? ['openid'],
      sendCookiesInRequests: config.sendCookiesInRequests,
      sendIdTokenInLogoutRequest: config.sendIdTokenInLogoutRequest,
      signInOptions: config.signInOptions,
      signInUrl: config.signInUrl,
      signOutOptions: config.signOutOptions,
      signUpOptions: config.signUpOptions,
      signUpUrl: config.signUpUrl,
      storage: config.storage,
      syncSession: config.syncSession,
      tokenLifecycle: config.tokenLifecycle,
      tokenRequest: config.tokenRequest ?? {authMethod: 'client_secret_post'},
      tokenValidation: config.tokenValidation,
    } as AuthClientConfig<ThunderIDSvelteKitConfig>;

    this.httpAdapter = config.httpAdapter;

    this._isLoading = true;
    try {
      await super.initialize(authConfig as any, storage);

      this._clientInitialized = true;
      emit(SDKEvent.INITIALIZED);
      return true;
    } finally {
      this._isLoading = false;
    }
  }

  override async reInitialize(config: Partial<ThunderIDSvelteKitConfig>): Promise<boolean> {
    if (!this._clientInitialized) {
      throw new IAMError({
        code: ErrorCode.SDK_NOT_INITIALIZED,
        message: 'SDK is not initialized. Call initialize() first.',
      });
    }
    await super.reInitialize(config as any);
    return true;
  }

  async reset(): Promise<void> {
    this._clientInitialized = false;
    this._isLoading = false;
    try {
      await super.clearSession();
      const sm = this.getStorageManager();
      await sm.removeConfigData();
      await sm.removeOIDCProviderMetaData();
      await sm.removeTemporaryData();
      await sm.removeHybridData();
    } catch {
      // ignore — session may not exist
    }
  }

  addEventListener(event: SDKEvent | string, listener: SDKEventListener): void {
    on(event, listener);
  }

  removeEventListener(event: SDKEvent | string, listener: SDKEventListener): void {
    off(event, listener);
  }

  clearEventListeners(event?: SDKEvent | string): void {
    clearListeners(event);
  }

  override isLoading(): boolean {
    return this._isLoading;
  }

  override getConfiguration(): AuthClientConfig<ThunderIDSvelteKitConfig> {
    return this.getStorageManager().getConfigData() as unknown as AuthClientConfig<ThunderIDSvelteKitConfig>;
  }

  override async signIn(
    config?: any,
    authorizationCode?: string,
    sessionState?: string,
    state?: string,
    tokenRequestConfig?: {params: Record<string, unknown>},
    onSuccess?: (user: any) => void,
  ): Promise<any> {
    const arg0: unknown = config;

    if (typeof arg0 === 'object' && arg0 !== null) {
      if ('_subject' in arg0 || 'stepType' in arg0) {
        emit(SDKEvent.MFA_STEP_REQUIRED, {
          message: 'App-Native (embedded) sign-in mode is not yet implemented. Multi-factor authentication steps will be emitted here in a future release.',
        });
        throw new IAMError({
          code: ErrorCode.NOT_IMPLEMENTED,
          message: 'App-Native (embedded) sign-in mode is not yet implemented. This will be available in a future release.',
        });
      }

      if ('code' in arg0 || 'state' in arg0) {
        const payload: {code?: unknown; session_state?: unknown; state?: unknown} = arg0 as {
          code?: unknown;
          session_state?: unknown;
          state?: unknown;
        };
        const code: string | undefined = typeof payload.code === 'string' ? payload.code : undefined;
        const ss: string | undefined = typeof payload.session_state === 'string' ? payload.session_state : undefined;
        const st: string | undefined = typeof payload.state === 'string' ? payload.state : undefined;

        try {
          const user = await super.signIn(undefined, code, ss, st);
          if (user && onSuccess) {
            onSuccess(user);
          }
          return user;
        } catch (err: unknown) {
          emit(SDKEvent.SIGN_IN_FAILED, {error: err instanceof Error ? err.message : String(err)});
          throw err;
        }
      }
    }

    const nonce: string = crypto.randomUUID();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('thunderid-nonce', nonce);
    }
    try {
      const user = await super.signIn({...(config || {}), nonce}, authorizationCode, sessionState, state, tokenRequestConfig);
      if (user) {
        emit(SDKEvent.SIGN_IN, {user});
        onSuccess?.(user);
      }
      return user;
    } catch (err: unknown) {
      emit(SDKEvent.SIGN_IN_FAILED, {error: err instanceof Error ? err.message : String(err)});
      throw err;
    }
  }

  override async signOut(...args: any[]): Promise<string> {
    const configData: any = await this.getStorageManager().getConfigData();
    const afterSignOutUrl: string =
      (configData?.afterSignOutUrl as string) || (configData?.afterSignInUrl as string) || '/';
    emit(SDKEvent.SIGN_OUT, {afterSignOutUrl});

    return super.signOut(args[0], args[1], args[2]);
  }

  override async revokeAccessToken(userId?: string): Promise<Response | boolean> {
    // Bypass BrowserClient._validateMethod() which calls isSignedIn() without userId
    const jsProto = Object.getPrototypeOf(ThunderIDBrowserClient.prototype);
    return (jsProto as any).revokeAccessToken.call(this, userId);
  }

  override async signUp(options?: Record<string, unknown>): Promise<void> {
    const configData: any = await this.getStorageManager().getConfigData();
    const signUpUrl: string | undefined = configData?.signUpUrl as string | undefined;
    const baseUrl: string | undefined = configData?.baseUrl as string | undefined;
    const applicationId: string | undefined = configData?.applicationId as string | undefined;

    if (signUpUrl) {
      window.location.href = signUpUrl;
      return;
    }

    if (baseUrl) {
      let url: string = `${baseUrl}/accountrecoveryendpoint/register.do`;
      if (applicationId) {
        url += `?spId=${applicationId}`;
      }
      window.location.href = url;
      return;
    }

    throw new IAMError({
      code: ErrorCode.INVALID_CONFIGURATION,
      message: 'Cannot sign up: no signUpUrl or baseUrl configured.',
    });
  }

  override async signInSilently(_options?: Record<string, unknown>): Promise<User | boolean> {
    if (!this._clientInitialized) {
      throw new IAMError({
        code: ErrorCode.SDK_NOT_INITIALIZED,
        message: 'SDK is not initialized. Call initialize() first.',
      });
    }

    try {
      const nonce: string = crypto.randomUUID();
      const authUrl: string = await this.getSignInUrl({...(_options as any), nonce});
      const url: URL = new URL(authUrl);
      url.searchParams.set('prompt', 'none');
      const stateParam: string | null = url.searchParams.get('state');
      const origin: string = window.location.origin;

      const iframe: HTMLIFrameElement = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const code: string | null = await new Promise<string | null>((resolve) => {
        let attempts = 0;

        const interval = setInterval((): void => {
          attempts++;
          try {
            const href: string | undefined = iframe.contentWindow?.location?.href;
            if (href && href.startsWith(origin)) {
              const parsed: URL = new URL(href);
              const c: string | null = parsed.searchParams.get('code');
              if (c) {
                clearInterval(interval);
                resolve(c);
                return;
              }
              if (parsed.searchParams.get('error')) {
                clearInterval(interval);
                resolve(null);
                return;
              }
            }
          } catch {
            // cross-origin — keep polling
          }
          if (attempts >= 100) {
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
      });

      document.body.removeChild(iframe);

      if (code) {
        await (this as any).requestAccessToken(code, '', stateParam ?? '');
        const idToken: string = await this.getIdToken();
        if (idToken) {
          const payload: Record<string, unknown> = await this.decodeJwtToken(idToken);
          if (payload['nonce'] !== nonce) {
            throw new IAMError({
              code: ErrorCode.AUTHENTICATION_FAILED,
              message: 'ID token nonce mismatch in silent sign-in',
            });
          }
        }
        const user: User = await this.getUser();
        emit(SDKEvent.SIGN_IN, {user});
        return user;
      }

      return false;
    } catch {
      return false;
    }
  }

  async changePassword(_currentPassword?: string, _newPassword?: string): Promise<void> {
    const configData: any = await this.getStorageManager().getConfigData();
    const changePasswordUrl: string | undefined = configData?.changePasswordUrl as string | undefined;
    const baseUrl: string | undefined = configData?.baseUrl as string | undefined;

    if (changePasswordUrl) {
      window.location.href = changePasswordUrl;
      return;
    }

    if (baseUrl) {
      window.location.href = `${baseUrl}/myaccount/security`;
      return;
    }

    throw new IAMError({
      code: ErrorCode.INVALID_CONFIGURATION,
      message: 'Cannot change password: no changePasswordUrl or baseUrl configured.',
    });
  }

  async forgotPassword(options?: Record<string, unknown>): Promise<void> {
    const configData: any = await this.getStorageManager().getConfigData();
    const forgotPasswordUrl: string | undefined = configData?.forgotPasswordUrl as string | undefined;
    const baseUrl: string | undefined = configData?.baseUrl as string | undefined;
    const applicationId: string | undefined = configData?.applicationId as string | undefined;

    const effectiveUrl: string | undefined = forgotPasswordUrl ?? (options?.['forgotPasswordUrl'] as string | undefined);

    if (effectiveUrl) {
      window.location.href = effectiveUrl;
      return;
    }

    if (baseUrl) {
      let url: string = `${baseUrl}/accountrecoveryendpoint/recoverpassword.do`;
      if (applicationId) {
        url += `?spId=${applicationId}`;
      }
      window.location.href = url;
      return;
    }

    throw new IAMError({
      code: ErrorCode.INVALID_CONFIGURATION,
      message: 'Cannot initiate password recovery: no forgotPasswordUrl or baseUrl configured.',
    });
  }

  async forgotUsername(options?: Record<string, unknown>): Promise<void> {
    const configData: any = await this.getStorageManager().getConfigData();
    const forgotUsernameUrl: string | undefined = configData?.forgotUsernameUrl as string | undefined;
    const baseUrl: string | undefined = configData?.baseUrl as string | undefined;
    const applicationId: string | undefined = configData?.applicationId as string | undefined;

    const effectiveUrl: string | undefined = forgotUsernameUrl ?? (options?.['forgotUsernameUrl'] as string | undefined);

    if (effectiveUrl) {
      window.location.href = effectiveUrl;
      return;
    }

    if (baseUrl) {
      let url: string = `${baseUrl}/accountrecoveryendpoint/recoverusername.do`;
      if (applicationId) {
        url += `?spId=${applicationId}`;
      }
      window.location.href = url;
      return;
    }

    throw new IAMError({
      code: ErrorCode.INVALID_CONFIGURATION,
      message: 'Cannot initiate username recovery: no forgotUsernameUrl or baseUrl configured.',
    });
  }

  override async decodeJwtToken<R = Record<string, unknown>>(token: string): Promise<R> {
    return super.decodeJwtToken<R>(token);
  }

  override async setSession(sessionData: Record<string, unknown>, sessionId?: string): Promise<void> {
    return super.setSession(sessionData, sessionId);
  }

  override clearSession(sessionId?: string): void {
    super.clearSession(sessionId);
  }

  override async updateUserProfile(payload: any, userId?: string): Promise<User> {
    const accessToken: string = await this.getAccessToken(userId);
    const configData: any = await this.getStorageManager().getConfigData();
    const baseUrl: string = (configData?.baseUrl ?? '') as string;

    const updateConfig: UpdateMeProfileConfig = {
      url: `${baseUrl}/scim2/Me`,
      payload,
      headers: {Authorization: `Bearer ${accessToken}`},
    };

    return updateMeProfile(updateConfig) as Promise<unknown> as Promise<User>;
  }

  async verifyIdToken(
    idToken: string,
    options?: {
      clientId?: string;
      issuer?: string;
      clockTolerance?: number;
      validateIssuer?: boolean;
      nonce?: string;
    },
  ): Promise<IdTokenValidationResult> {
    const configData: any = await this.getStorageManager().getConfigData();
    return verifyIdToken(idToken, configData as ThunderIDSvelteKitConfig, options);
  }

  public async getAuthorizeRequestUrl(customParams: Record<string, any>, userId?: string): Promise<string> {
    return this.getSignInUrl(customParams, userId);
  }

  async createOrganization(
    payload: {description: string; name: string; orgHandle?: string; parentId: string; type: 'TENANT'},
    userId?: string,
  ): Promise<{id: string; name: string; orgHandle: string; ref?: string; status?: string}> {
    const configData: any = await this.getStorageManager().getConfigData();
    const baseUrl: string = (configData?.baseUrl ?? '') as string;
    const accessToken: string = await this.getAccessToken(userId);
    const adapter: HTTPAdapter = this.httpAdapter ?? new DefaultHTTPAdapter();
    const res: HTTPResponse = await adapter.request('POST', `${baseUrl}/api/server/v1/organizations`, {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }, payload);
    if (res.statusCode !== 201) {
      throw new IAMError({
        code: ErrorCode.SERVER_ERROR,
        message: `Failed to create organization: ${res.statusCode}`,
        requestId: res.headers['x-request-id'] || res.headers['correlation-id'] || undefined,
        statusCode: res.statusCode,
      });
    }
    return JSON.parse(res.body);
  }

  async getOrganization(
    organizationId: string,
    userId?: string,
  ): Promise<{
    attributes?: Record<string, any>; created?: string; description?: string; id: string;
    lastModified?: string; name: string; orgHandle: string; parent?: {id: string; ref: string};
    permissions?: string[]; status?: string; type?: string;
  }> {
    const configData: any = await this.getStorageManager().getConfigData();
    const baseUrl: string = (configData?.baseUrl ?? '') as string;
    const accessToken: string = await this.getAccessToken(userId);
    const adapter: HTTPAdapter = this.httpAdapter ?? new DefaultHTTPAdapter();
    const res: HTTPResponse = await adapter.request('GET', `${baseUrl}/api/server/v1/organizations/${organizationId}`, {
      Authorization: `Bearer ${accessToken}`,
    });
    if (res.statusCode !== 200) {
      throw new IAMError({
        code: ErrorCode.SERVER_ERROR,
        message: `Failed to fetch organization ${organizationId}: ${res.statusCode}`,
        requestId: res.headers['x-request-id'] || res.headers['correlation-id'] || undefined,
        statusCode: res.statusCode,
      });
    }
    return JSON.parse(res.body);
  }

  async getUserInfo(sessionId?: string): Promise<User> {
    const accessToken: string = await this.getAccessToken(sessionId);
    const configData: any = await this.getStorageManager().getConfigData();
    const baseUrl: string = (configData?.baseUrl ?? '') as string;
    const adapter: HTTPAdapter = this.httpAdapter ?? new DefaultHTTPAdapter();
    const res: HTTPResponse = await adapter.request('GET', `${baseUrl}/oauth2/userinfo`, {
      Authorization: `Bearer ${accessToken}`,
    });
    if (res.statusCode !== 200) {
      throw new IAMError({
        code: ErrorCode.AUTHENTICATION_FAILED,
        message: `Failed to fetch user info: ${res.statusCode}`,
        requestId: res.headers['x-request-id'] || res.headers['correlation-id'] || undefined,
        statusCode: res.statusCode,
      });
    }
    return JSON.parse(res.body) as User;
  }

  override async getUser(sessionId?: string): Promise<User> {
    // Bypass BrowserClient._validateMethod() which calls isSignedIn() without userId
    const sessionData: any = await (this as any).storageManager.getSessionData(sessionId);
    const user: any = (this as any).authHelper.getAuthenticatedUserInfo(sessionData?.id_token);
    Object.keys(user).forEach((key: string) => {
      if (user[key] === undefined || user[key] === '' || user[key] === null) {
        delete user[key];
      }
    });
    return user;
  }

  override getAccessToken(sessionId?: string): Promise<string> {
    return super.getAccessToken(sessionId);
  }

  override async getIdToken(sessionId?: string): Promise<string> {
    // Bypass BrowserClient._validateMethod() which calls isSignedIn() without userId
    const sessionData = await (this as any).storageManager.getSessionData(sessionId);
    return sessionData?.id_token;
  }

  override async getDecodedIdToken(sessionId?: string, idToken?: string): Promise<IdToken> {
    // Bypass BrowserClient._validateMethod() which calls isSignedIn() without userId
    const sessionData = await (this as any).storageManager.getSessionData(sessionId);
    const storedIdToken = sessionData?.id_token;
    return (this as any).cryptoHelper.decodeJwtToken(storedIdToken ?? idToken) as Promise<IdToken>;
  }

  override isSignedIn(sessionId?: string): Promise<boolean> {
    return super.isSignedIn(sessionId);
  }

  override async exchangeToken(config: SPATokenExchangeConfig): Promise<Response | User> {
    if (!config.id) {
      return Promise.reject(
        new Error('The custom grant request id not found. Set the `id` attribute on the token exchange config.'),
      );
    }

    const response = await (this as any)._authHelper!.exchangeToken(config, (cfg: any) =>
      (this as any)._enableRetrievingSignOutURLFromSession(cfg),
    );

    const cb = (this as any)._onCustomGrant.get(config.id);
    cb?.(response);

    return response;
  }

  override async getUserProfile(sessionId?: string): Promise<UserProfile> {
    const user: User = await this.getUser(sessionId);
    return {flattenedProfile: user, profile: user, schemas: []};
  }

  async exchangeCodeForTokens(
    authorizationCode: string,
    sessionState: string,
    state: string,
    userId: string,
  ): Promise<TokenResponse> {
    if (!this._clientInitialized) {
      throw new IAMError({
        code: ErrorCode.SDK_NOT_INITIALIZED,
        message: 'SDK is not initialized. Call initialize() first.',
      });
    }

    return (this as any).requestAccessToken(authorizationCode, sessionState, state, userId);
  }

  async getBrandingPreference(config: GetBrandingPreferenceConfig): Promise<BrandingPreference> {
    return getBrandingPreference(config);
  }

  public override getStorageManager(): StorageManager<AuthClientConfig<ThunderIDSvelteKitConfig>> {
    return super.getStorageManager() as StorageManager<AuthClientConfig<ThunderIDSvelteKitConfig>>;
  }
}

export default ThunderIDSvelteClient;
