/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  ThunderIDNodeClient,
  type AuthClientConfig,
  type BrandingPreference,
  type GetBrandingPreferenceConfig,
  type IdToken,
  type Organization,
  type Storage,
  type TokenExchangeRequestConfig,
  type TokenResponse,
  type User,
  type UserProfile,
  getBrandingPreference,
  getMeOrganizations,
  MemoryCacheStore,
} from '@thunderid/node';
import {IAMError, ErrorCode} from './errors/IAMError';
import {getLogger, type LoggerAdapter} from './logger/LoggerAdapter';
import type {ThunderIDSvelteConfig} from './models/config';
import type {ThunderIDSessionPayload} from './models/session';

class ThunderIDSvelteClient extends ThunderIDNodeClient<AuthClientConfig<ThunderIDSvelteConfig>> {
  private static instance: ThunderIDSvelteClient;

  public isInitialized = false;
  private _isLoading = false;
  private logger: LoggerAdapter = getLogger();

  private constructor() {
    super();
  }

  public static getInstance(): ThunderIDSvelteClient {
    if (!ThunderIDSvelteClient.instance) {
      ThunderIDSvelteClient.instance = new ThunderIDSvelteClient();
    }
    return ThunderIDSvelteClient.instance;
  }

  override async initialize(config: ThunderIDSvelteConfig, storage?: Storage): Promise<boolean> {
    if (this.isInitialized) {
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

    const authConfig: AuthClientConfig<ThunderIDSvelteConfig> = {
      afterSignInUrl: config.afterSignInUrl ?? '/',
      afterSignOutUrl: config.afterSignOutUrl ?? '/',
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret ?? undefined,
      enablePKCE: true,
      scopes: config.scopes ?? ['openid', 'profile'],
      tokenRequest: config.tokenRequest ?? {authMethod: 'client_secret_post'},
    } as AuthClientConfig<ThunderIDSvelteConfig>;

    const resolvedStorage: Storage = storage ?? new MemoryCacheStore();

    this._isLoading = true;
    try {
      const result: boolean = await super.initialize(
        authConfig as unknown as AuthClientConfig<ThunderIDSvelteConfig>,
        resolvedStorage,
      );
      this.isInitialized = true;
      return result;
    } finally {
      this._isLoading = false;
    }
  }

  override async reInitialize(config: Partial<ThunderIDSvelteConfig>): Promise<boolean> {
    if (!this.isInitialized) {
      throw new IAMError({
        code: ErrorCode.SDK_NOT_INITIALIZED,
        message: 'SDK is not initialized. Call initialize() first.',
      });
    }
    await super.reInitialize(config as any);
    return true;
  }

  override isLoading(): boolean {
    return this._isLoading;
  }

  override getConfiguration(): AuthClientConfig<ThunderIDSvelteConfig> {
    const storageManager: any = this.getStorageManager();
    return storageManager?.getConfigData?.() as AuthClientConfig<ThunderIDSvelteConfig>;
  }

  async rehydrateSessionFromPayload(session: ThunderIDSessionPayload): Promise<void> {
    if (!this.isInitialized || !session?.sessionId || !session?.accessToken) {
      return;
    }

    const storageManager: any = this.getStorageManager();
    const iatSeconds: number = typeof session.iat === 'number' ? session.iat : Math.floor(Date.now() / 1000);
    const expiresInSeconds: number =
      typeof session.accessTokenExpiresAt === 'number' ? Math.max(0, session.accessTokenExpiresAt - iatSeconds) : 3600;

    await storageManager.setSessionData(
      {
        access_token: session.accessToken,
        created_at: iatSeconds * 1000,
        expires_in: String(expiresInSeconds || 3600),
        id_token: session.idToken ?? '',
        refresh_token: session.refreshToken ?? '',
        scope: session.scopes ?? '',
        session_state: '',
        token_type: 'Bearer',
      },
      session.sessionId,
    );
  }

  override signIn(...args: any[]): Promise<any> {
    const arg0: unknown = args[0];

    if (typeof arg0 === 'object' && arg0 !== null && ('code' in arg0 || 'state' in arg0)) {
      const payload: {code?: unknown; session_state?: unknown; state?: unknown} = arg0 as {
        code?: unknown;
        session_state?: unknown;
        state?: unknown;
      };
      const code: string | undefined = typeof payload.code === 'string' ? payload.code : undefined;
      const sessionState: string | undefined =
        typeof payload.session_state === 'string' ? payload.session_state : undefined;
      const state: string | undefined = typeof payload.state === 'string' ? payload.state : undefined;
      const extraParams: Record<string, string | boolean> = {};

      if (code) extraParams['code'] = code;
      if (sessionState) extraParams['session_state'] = sessionState;
      if (state) extraParams['state'] = state;

      return super.signIn(args[3], args[2], code, sessionState, state, extraParams);
    }

    return super.signIn(args[0], args[1], args[2], args[3], args[4], args[5]);
  }

  override async signOut(...args: any[]): Promise<string> {
    const configData: any = await this.getStorageManager().getConfigData();
    return (configData?.afterSignOutUrl as string) || (configData?.afterSignInUrl as string) || '/';
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
      let url = `${baseUrl}/accountrecoveryendpoint/register.do`;
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
    if (!this.isInitialized) {
      throw new IAMError({
        code: ErrorCode.SDK_NOT_INITIALIZED,
        message: 'SDK is not initialized. Call initialize() first.',
      });
    }

    try {
      const signedIn: boolean = await this.isSignedIn();
      if (signedIn) {
        const user: User = await this.getUser();
        return user;
      }
      return false;
    } catch {
      return false;
    }
  }

  async changePassword(_currentPassword: string, _newPassword: string): Promise<void> {
    throw new IAMError({
      code: ErrorCode.NOT_IMPLEMENTED,
      message: 'changePassword() is not yet implemented. This will be available in a future release.',
    });
  }

  async setSessionData(sessionData: Record<string, unknown>, sessionId?: string): Promise<void> {
    const storageManager: any = this.getStorageManager();
    await storageManager.setSessionData(sessionData, sessionId);
  }

  clearSessionData(sessionId?: string): void {
    const storageManager: any = this.getStorageManager();
    storageManager.clearSession(sessionId);
  }

  override getAllOrganizations(_options?: Record<string, unknown>, _sessionId?: string): Promise<any> {
    throw new IAMError({
      code: ErrorCode.NOT_IMPLEMENTED,
      message: 'getAllOrganizations() is not yet implemented. Use getMyOrganizations() instead.',
    });
  }

  public async getAuthorizeRequestUrl(customParams: Record<string, any>, userId?: string): Promise<string> {
    return this.getSignInUrl(customParams, userId);
  }

  override getUser(sessionId?: string): Promise<User> {
    return super.getUser(sessionId);
  }

  override getAccessToken(sessionId?: string): Promise<string> {
    return super.getAccessToken(sessionId);
  }

  override getDecodedIdToken(sessionId?: string, idToken?: string): Promise<IdToken> {
    return super.getDecodedIdToken(sessionId, idToken);
  }

  override isSignedIn(sessionId?: string): Promise<boolean> {
    return super.isSignedIn(sessionId);
  }

  override exchangeToken(
    config: TokenExchangeRequestConfig,
    sessionId?: string,
  ): Promise<TokenResponse | Response> {
    return super.exchangeToken(config, sessionId) as unknown as Promise<TokenResponse | Response>;
  }

  override async getUserProfile(sessionId?: string): Promise<UserProfile> {
    const user: User = await this.getUser(sessionId);
    return {flattenedProfile: user, profile: user, schemas: []};
  }

  override async getCurrentOrganization(sessionId?: string): Promise<Organization | null> {
    try {
      const idToken: IdToken = await this.getDecodedIdToken(sessionId);
      if (!idToken?.org_id) {
        return null;
      }
      return {
        id: idToken.org_id,
        name: idToken.org_name ?? '',
        orgHandle: idToken.org_handle ?? '',
      };
    } catch {
      return null;
    }
  }

  override async getMyOrganizations(sessionId?: string): Promise<Organization[]> {
    const accessToken: string = await this.getAccessToken(sessionId);
    const configData: any = await this.getStorageManager().getConfigData();
    const baseUrl: string = (configData?.baseUrl ?? '') as string;

    return getMeOrganizations({
      baseUrl,
      headers: {Authorization: `Bearer ${accessToken}`},
    });
  }

  override async switchOrganization(
    organization: Organization,
    sessionId?: string,
  ): Promise<TokenResponse | Response> {
    if (!organization.id) {
      throw new IAMError({
        code: ErrorCode.INVALID_INPUT,
        message: 'Organization ID is required for switching organizations.',
      });
    }

    const exchangeConfig: TokenExchangeRequestConfig = {
      attachToken: false,
      data: {
        client_id: '{{clientId}}',
        client_secret: '{{clientSecret}}',
        grant_type: 'organization_switch',
        scope: '{{scopes}}',
        switching_organization: organization.id,
        token: '{{accessToken}}',
      },
      id: 'organization-switch',
      returnsSession: true,
      signInRequired: true,
    };

    return this.exchangeToken(exchangeConfig, sessionId);
  }

  async getBrandingPreference(config: GetBrandingPreferenceConfig): Promise<BrandingPreference> {
    return getBrandingPreference(config);
  }

  public override getStorageManager(): any {
    return super.getStorageManager();
  }
}

export default ThunderIDSvelteClient;
