// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ThunderIDBrowserClient,
  UserProfile,
  SignInOptions,
  User,
  SignUpOptions,
  ThunderIDRuntimeError,
  executeEmbeddedSignInFlow,
  IdToken,
  extractUserClaimsFromIdToken,
  TokenResponse,
  HttpRequestConfig,
  HttpResponse,
  TokenExchangeRequestConfig,
  isEmpty,
  EmbeddedSignInFlowResponse,
  executeEmbeddedSignUpFlow,
  executeEmbeddedRecoveryFlow,
  EmbeddedSignInFlowStatus,
  EmbeddedSignUpFlowStatus,
  resolveResourceEndpoint,
} from '@thunderid/browser';
import {ThunderIDReactConfig} from './models/config';

class ThunderIDReactClient<T extends ThunderIDReactConfig = ThunderIDReactConfig> extends ThunderIDBrowserClient<T> {
  private loadingState = false;

  private _initializeConfig: ThunderIDReactConfig | undefined;

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

  override initialize(config: ThunderIDReactConfig): Promise<boolean> {
    return this.withLoading(async () => {
      this._initializeConfig = {
        ...config,
        periodicTokenRefresh:
          config?.tokenLifecycle?.refreshToken?.autoRefresh ?? (config as any)?.periodicTokenRefresh,
      } as any;

      return super.initialize(this._initializeConfig as unknown as T);
    });
  }

  override reInitialize(config: Partial<ThunderIDReactConfig>): Promise<boolean> {
    return this.withLoading(async () => {
      let isInitialized: boolean;

      try {
        await super.reInitialize(config as Partial<T>);
        isInitialized = true;
      } catch (error) {
        throw new ThunderIDRuntimeError(
          `Failed to check if the client is initialized: ${error instanceof Error ? error.message : String(error)}`,
          'ThunderIDReactClient-reInitialize-RuntimeError-001',
          'react',
          'An error occurred while checking the initialization status of the client.',
        );
      }

      return isInitialized;
    });
  }

  override async updateUserProfile(): Promise<User> {
    throw new Error('Not implemented');
  }

  override async getUser(): Promise<User> {
    return extractUserClaimsFromIdToken(await this.getDecodedIdToken());
  }

  override async getDecodedIdToken(sessionId?: string): Promise<IdToken> {
    return super.getDecodedIdToken(sessionId);
  }

  override async getIdToken(): Promise<string> {
    return this.withLoading(async () => super.getIdToken());
  }

  override async getUserProfile(): Promise<UserProfile> {
    return this.withLoading(async () => {
      const claims: User = extractUserClaimsFromIdToken(await this.getDecodedIdToken());
      return {
        flattenedProfile: claims,
        profile: claims,
        schemas: [],
      };
    });
  }

  override isLoading(): boolean {
    return this.loadingState || super.isLoading();
  }

  override async isSignedIn(): Promise<boolean> {
    return super.isSignedIn();
  }

  override async exchangeToken(config: TokenExchangeRequestConfig): Promise<TokenResponse | Response> {
    return this.withLoading(async () => super.exchangeToken(config) as unknown as TokenResponse | Response);
  }

  override async signIn(...args: any[]): Promise<User | EmbeddedSignInFlowResponse> {
    return this.withLoading(async () => {
      const arg1: any = args[0];
      const arg2: any = args[1];

      let config: ThunderIDReactConfig | undefined = (await this.getStorageManager().getConfigData()) as
        | ThunderIDReactConfig
        | undefined;

      // NOTE: With React 19 strict mode, the initialization logic runs twice, and there's an intermittent
      // issue where the config object is not getting stored in the storage layer with Vite scaffolding.
      // Hence, we need to check if the client is initialized but the config object is empty, and reinitialize.
      if (!config || Object.keys(config).length === 0) {
        await this.initialize(this._initializeConfig!);
        // Reload the config persisted by initialization so downstream endpoint resolution
        // (baseUrl and the flowExecute override) uses the recovered values, not the stale empty config.
        config = (await this.getStorageManager().getConfigData()) as ThunderIDReactConfig | undefined;
      }

      if (typeof arg1 === 'object' && arg1 !== null && arg1.callOnlyOnRedirect === true) {
        return undefined as any;
      }

      if (
        typeof arg1 === 'object' &&
        arg1 !== null &&
        !isEmpty(arg1) &&
        ('executionId' in arg1 || 'applicationId' in arg1)
      ) {
        this.rejectEmbeddedFlowInBackendMode();

        const authIdFromUrl: string = new URL(window.location.href).searchParams.get('authId') ?? '';
        const authIdFromStorage: string =
          ((await this.getStorageManager().getHybridDataParameter('authId')) as string) ?? '';
        const authId: string = authIdFromUrl || authIdFromStorage;
        const baseUrl: string = config?.baseUrl ?? '';

        const response: EmbeddedSignInFlowResponse = await executeEmbeddedSignInFlow({
          authId,
          baseUrl,
          payload: arg1,
          url: resolveResourceEndpoint('flowExecute', config, arg2?.url),
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

      return (await super.signIn(...args)) as unknown as User;
    });
  }

  override async signInSilently(options?: SignInOptions): Promise<User | boolean> {
    return super.signInSilently(options as Record<string, string | boolean>) as Promise<User | boolean>;
  }

  override async signUp(options?: SignUpOptions): Promise<void>;
  override async signUp(payload: any): Promise<any>;
  override async signUp(...args: any[]): Promise<void | any> {
    this.rejectEmbeddedFlowInBackendMode();

    const config: ThunderIDReactConfig = (await this.getStorageManager().getConfigData()) as ThunderIDReactConfig;
    const firstArg: any = args[0];
    const baseUrl: string = config?.baseUrl ?? '';

    const authId: string = new URL(window.location.href).searchParams.get('authId') ?? '';

    const response: any = await executeEmbeddedSignUpFlow({
      authId,
      baseUrl,
      payload: typeof firstArg === 'object' && 'flowType' in firstArg ? {...firstArg, verbose: true} : firstArg,
      url: resolveResourceEndpoint('flowExecute', config),
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

  override async recover(payload?: any): Promise<any> {
    this.rejectEmbeddedFlowInBackendMode();

    const config: ThunderIDReactConfig = (await this.getStorageManager().getConfigData()) as ThunderIDReactConfig;

    return executeEmbeddedRecoveryFlow({
      baseUrl: config?.baseUrl,
      payload: {...payload, verbose: true},
      url: resolveResourceEndpoint('flowExecute', config),
    }) as any;
  }

  /**
   * The embedded flows keep their result in the browser, which running sign-in on the backend rules
   * out. Running them through the backend is not supported yet.
   */
  private rejectEmbeddedFlowInBackendMode(): void {
    if (this.isBackendMode()) {
      throw new ThunderIDRuntimeError(
        'Embedded sign-in, sign-up, and recovery flows are not supported when sign-in runs on the backend.',
        'ThunderIDReactClient-embeddedFlow-RuntimeError-001',
        'react',
        'Use redirect sign-in with the backend.',
      );
    }
  }

  public override getStorageManager(): any {
    return super.getStorageManager();
  }

  async request(requestConfig?: HttpRequestConfig): Promise<HttpResponse<any>> {
    return super.httpRequest(requestConfig!) as Promise<HttpResponse<any>>;
  }

  async requestAll(requestConfigs?: HttpRequestConfig[]): Promise<HttpResponse<any>[]> {
    return super.httpRequestAll(requestConfigs!) as Promise<HttpResponse<any>[]>;
  }
}

export default ThunderIDReactClient;
