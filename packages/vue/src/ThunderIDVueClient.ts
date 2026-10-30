// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ThunderIDBrowserClient,
  generateFlattenedUserProfile,
  UserProfile,
  User,
  SignUpOptions,
  ThunderIDRuntimeError,
  executeEmbeddedSignUpFlow,
  executeEmbeddedSignInFlow,
  IdToken,
  extractUserClaimsFromIdToken,
  TokenResponse,
  HttpRequestConfig,
  HttpResponse,
  TokenExchangeRequestConfig,
  isEmpty,
  EmbeddedSignInFlowResponse,
  EmbeddedSignInFlowStatus,
  EmbeddedSignUpFlowStatus,
  StorageManager,
  AuthClientConfig,
  resolveRequestBaseUrl,
  resolveResourceEndpoint,
} from '@thunderid/browser';
import getUsersMe from './api/account/getUsersMe';
import {ThunderIDVueConfig} from './models/config';

/**
 * Client for implementing ThunderID in Vue applications.
 * This class provides the core functionality for managing user authentication and sessions.
 *
 * @typeParam T - Configuration type that extends ThunderIDVueConfig.
 */
class ThunderIDVueClient<T extends ThunderIDVueConfig = ThunderIDVueConfig> extends ThunderIDBrowserClient<T> {
  private loadingState = false;

  constructor(instanceId = 0) {
    super(instanceId);
  }

  private setLoading(loading: boolean): void {
    this.loadingState = loading;
  }

  private async withLoading<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    this.setLoading(true);
    try {
      const result: TResult = await operation();
      return result;
    } finally {
      this.setLoading(false);
    }
  }

  override initialize(config: ThunderIDVueConfig): Promise<boolean> {
    return this.withLoading(async () => super.initialize(config as unknown as T));
  }

  override reInitialize(config: Partial<ThunderIDVueConfig>): Promise<boolean> {
    return this.withLoading(async () => {
      let isInitialized: boolean;

      try {
        await super.reInitialize(config as Partial<T>);
        isInitialized = true;
      } catch (error) {
        throw new ThunderIDRuntimeError(
          `Failed to check if the client is initialized: ${error instanceof Error ? error.message : String(error)}`,
          'ThunderIDVueClient-reInitialize-RuntimeError-001',
          'vue',
          'An error occurred while checking the initialization status of the client.',
        );
      }

      return isInitialized;
    });
  }

  override async updateUserProfile(): Promise<User> {
    throw new Error('Not implemented');
  }

  // The param is a supertype of the base `getUser(userId?: string)` so the override stays valid,
  // while still typing the options object this client actually accepts.
  override async getUser(options?: string | {baseUrl?: string; url?: string}): Promise<User> {
    try {
      const opts: {baseUrl?: string; url?: string} | undefined =
        typeof options === 'object' && options !== null ? options : undefined;
      const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
      const baseUrl: string | undefined = opts?.baseUrl ?? resolveRequestBaseUrl(configData);

      const profile: User = await getUsersMe({
        baseUrl,
        url: resolveResourceEndpoint('usersMe', configData, opts?.url),
      });

      return profile;
    } catch (error) {
      return extractUserClaimsFromIdToken(await this.getDecodedIdToken());
    }
  }

  override async getDecodedIdToken(sessionId?: string): Promise<IdToken> {
    return await super.getDecodedIdToken(sessionId);
  }

  override async getIdToken(): Promise<string> {
    return this.withLoading(async () => super.getIdToken());
  }

  override async getUserProfile(options?: {baseUrl?: string; url?: string}): Promise<UserProfile> {
    return this.withLoading(async () => {
      try {
        const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
        const baseUrl: string | undefined = options?.baseUrl ?? resolveRequestBaseUrl(configData);

        const profile: User = await getUsersMe({
          baseUrl,
          instanceId: this.getInstanceId(),
          url: resolveResourceEndpoint('usersMe', configData, options?.url),
        });

        const output: UserProfile = {
          flattenedProfile: generateFlattenedUserProfile(profile),
          profile,
        };

        return output;
      } catch (error) {
        return {
          flattenedProfile: extractUserClaimsFromIdToken(await this.getDecodedIdToken()),
          profile: extractUserClaimsFromIdToken(await this.getDecodedIdToken()),
        };
      }
    });
  }

  override isLoading(): boolean {
    return this.loadingState || super.isLoading();
  }

  override async isInitialized(): Promise<boolean> {
    return super.isInitialized();
  }

  override async isSignedIn(): Promise<boolean> {
    return await super.isSignedIn();
  }

  override async exchangeToken(config: TokenExchangeRequestConfig): Promise<TokenResponse | Response> {
    return this.withLoading(
      async () => (await super.exchangeToken(config as any)) as unknown as TokenResponse | Response,
    );
  }

  override async signIn(...args: any[]): Promise<any> {
    return this.withLoading(async () => {
      const arg1: any = args[0];
      const arg2: any = args[1];

      if (typeof arg1 === 'object' && arg1 !== null && arg1.callOnlyOnRedirect === true) {
        return undefined;
      }

      if (
        typeof arg1 === 'object' &&
        arg1 !== null &&
        !isEmpty(arg1) &&
        ('executionId' in arg1 || 'applicationId' in arg1)
      ) {
        const configData: any = await this.getStorageManager().getConfigData();
        const authIdFromUrl: string | null = new URL(window.location.href).searchParams.get('authId');
        const authIdFromStorage: string | null = (await this.getStorageManager().getHybridDataParameter('authId')) as
          | string
          | null;
        const authId: string = authIdFromUrl || authIdFromStorage || '';
        const baseUrl: string = configData?.baseUrl || '';

        const response: EmbeddedSignInFlowResponse = await executeEmbeddedSignInFlow({
          authId,
          baseUrl,
          payload: arg1,
          url: resolveResourceEndpoint('flowExecute', configData, arg2?.url),
        });

        if (
          response &&
          typeof response === 'object' &&
          response.flowStatus === EmbeddedSignInFlowStatus.Complete &&
          response.assertion
        ) {
          const decodedAssertion: {
            [key: string]: unknown;
            exp?: number;
            iat?: number;
            scope?: string;
          } = await this.decodeJwtToken<{
            [key: string]: unknown;
            exp?: number;
            iat?: number;
            scope?: string;
          }>(response.assertion);

          const createdAt: number = decodedAssertion.iat ? decodedAssertion.iat * 1000 : Date.now();
          const expiresIn: number =
            decodedAssertion.exp && decodedAssertion.iat ? decodedAssertion.exp - decodedAssertion.iat : 3600;

          await this.setSession({
            access_token: response.assertion,
            created_at: createdAt,
            expires_in: expiresIn,
            id_token: response.assertion,
            scope: decodedAssertion.scope,
            token_type: 'Bearer',
          });

          this.notifySignIn(extractUserClaimsFromIdToken(decodedAssertion as IdToken) as User);
        }

        return response;
      }

      return (await super.signIn(arg1))!;
    });
  }

  override async signInSilently(options?: any): Promise<User | boolean> {
    return (await super.signInSilently(options as Record<string, string | boolean>))!;
  }

  override async signUp(...args: any[]): Promise<any> {
    const configData: any = await this.getStorageManager().getConfigData();
    const firstArg: any = args[0];
    const baseUrl: string = configData?.baseUrl || '';

    const authId: string = new URL(window.location.href).searchParams.get('authId') ?? '';

    const response: any = await executeEmbeddedSignUpFlow({
      authId,
      baseUrl,
      payload: typeof firstArg === 'object' && 'flowType' in firstArg ? {...firstArg, verbose: true} : firstArg,
      url: resolveResourceEndpoint('flowExecute', configData),
    });

    if (
      response &&
      typeof response === 'object' &&
      response.flowStatus === EmbeddedSignUpFlowStatus.Complete &&
      response.assertion
    ) {
      const decodedAssertion: {
        [key: string]: unknown;
        exp?: number;
        iat?: number;
        scope?: string;
      } = await this.decodeJwtToken<{
        [key: string]: unknown;
        exp?: number;
        iat?: number;
        scope?: string;
      }>(response.assertion);

      const createdAt: number = decodedAssertion.iat ? decodedAssertion.iat * 1000 : Date.now();
      const expiresIn: number =
        decodedAssertion.exp && decodedAssertion.iat ? decodedAssertion.exp - decodedAssertion.iat : 3600;

      await this.setSession({
        access_token: response.assertion,
        created_at: createdAt,
        expires_in: expiresIn,
        id_token: response.assertion,
        scope: decodedAssertion.scope,
        token_type: 'Bearer',
      });

      this.notifySignIn(extractUserClaimsFromIdToken(decodedAssertion as IdToken) as User);
    }

    return response;
  }

  async request(requestConfig?: HttpRequestConfig): Promise<HttpResponse<any>> {
    return (await this.httpRequest(requestConfig!))!;
  }

  async requestAll(requestConfigs?: HttpRequestConfig[]): Promise<HttpResponse<any>[]> {
    return (await this.httpRequestAll(requestConfigs!))!;
  }

  override async getAccessToken(sessionId?: string): Promise<string> {
    return super.getAccessToken(sessionId);
  }

  override clearSession(sessionId?: string): void {
    super.clearSession(sessionId);
  }

  override async setSession(sessionData: Record<string, unknown>, sessionId?: string): Promise<void> {
    return this.getStorageManager().setSessionData(sessionData, sessionId);
  }

  override decodeJwtToken<TResult = Record<string, unknown>>(token: string): Promise<TResult> {
    return super.decodeJwtToken<TResult>(token);
  }

  public override getStorageManager(): StorageManager<T> {
    return super.getStorageManager();
  }
}

export default ThunderIDVueClient;
