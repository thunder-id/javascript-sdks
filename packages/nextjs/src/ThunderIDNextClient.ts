// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ThunderIDNodeClient,
  ThunderIDRuntimeError,
  AttributeSchema,
  AuthClientConfig,
  EmbeddedSignInFlowResponse,
  ExtendedAuthorizeRequestUrlParams,
  IdToken,
  SignInOptions,
  SignUpOptions,
  Storage,
  TokenExchangeRequestConfig,
  TokenResponse,
  User,
  UserProfile,
  executeEmbeddedSignInFlow,
  extractUserClaimsFromIdToken,
  generateFlattenedUserProfile,
  getUsersMe,
  getUsersMeMeta,
  updateMeCredentials,
  updateMeProfile,
  resolveResourceEndpoint,
} from '@thunderid/node';
import {ThunderIDNextConfig} from './models/config';
import getClientOrigin from './server/actions/getClientOrigin';
import getSessionId from './server/actions/getSessionId';
import decorateConfigWithNextEnv from './utils/decorateConfigWithNextEnv';

class ThunderIDNextClient<T extends ThunderIDNextConfig = ThunderIDNextConfig> extends ThunderIDNodeClient<T> {
  public isInitialized = false;

  public constructor() {
    super();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      // Server actions may run in a module context that hasn't been through
      // ThunderIDServerProvider (e.g. a different worker). Try to initialize
      // from environment variables before giving up.
      await this.initialize({} as T);
    }

    if (!this.isInitialized) {
      throw new Error(
        '[ThunderIDNextClient] Client is not initialized. Make sure you have wrapped your app with ThunderIDProvider and provided the required configuration (baseUrl, clientId, etc.).',
      );
    }
  }

  override async initialize(config: T, storage?: Storage): Promise<boolean> {
    if (this.isInitialized) {
      return Promise.resolve(true);
    }

    const {
      baseUrl,
      organizationHandle,
      clientId,
      clientSecret,
      flowSecret,
      signInUrl,
      afterSignInUrl,
      afterSignOutUrl,
      signUpUrl,
      ...rest
    } = decorateConfigWithNextEnv(config);

    const origin: string = await getClientOrigin();

    const initialized: boolean = await super.initialize(
      {
        ...rest,
        afterSignInUrl: afterSignInUrl ?? origin,
        afterSignOutUrl: afterSignOutUrl ?? origin,
        baseUrl,
        clientId,
        clientSecret,
        enablePKCE: (rest as any).enablePKCE ?? true,
        flowSecret,
        organizationHandle,
        signInUrl,
        signUpUrl,
      } as any,
      storage,
    );

    this.isInitialized = initialized;

    return initialized;
  }

  override async reInitialize(config: Partial<T>): Promise<boolean> {
    try {
      await super.reInitialize(config);
      return true;
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Failed to re-initialize the client: ${error instanceof Error ? error.message : String(error)}`,
        'ThunderIDNextClient-reInitialize-RuntimeError-001',
        'nextjs',
        'An error occurred while re-initializing the client. Please check your configuration and network connection.',
      );
    }
  }

  override async getUser(userId?: string): Promise<User> {
    await this.ensureInitialized();
    const resolvedSessionId: string = userId || (await getSessionId())!;

    try {
      const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
      const baseUrl: string | undefined = configData?.baseUrl;

      const profile: User = await getUsersMe({
        baseUrl,
        url: resolveResourceEndpoint('usersMe', configData),
        headers: {
          Authorization: `Bearer ${await this.getAccessToken(userId)}`,
        },
      });

      return profile;
    } catch (error) {
      return await super.getUser(resolvedSessionId);
    }
  }

  override async getUserProfile(userId?: string): Promise<UserProfile> {
    await this.ensureInitialized();

    try {
      const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
      const baseUrl: string | undefined = configData?.baseUrl;

      const profile: User = await getUsersMe({
        baseUrl,
        url: resolveResourceEndpoint('usersMe', configData),
        headers: {
          Authorization: `Bearer ${await this.getAccessToken(userId)}`,
        },
      });

      return {
        flattenedProfile: generateFlattenedUserProfile(profile),
        profile,
      };
    } catch (error) {
      return {
        flattenedProfile: extractUserClaimsFromIdToken(await super.getDecodedIdToken(userId)),
        profile: extractUserClaimsFromIdToken(await super.getDecodedIdToken(userId)),
      };
    }
  }

  async getUserSchema(userId?: string): Promise<Record<string, AttributeSchema> | null> {
    await this.ensureInitialized();

    try {
      const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
      const baseUrl: string | undefined = configData?.baseUrl;

      const {schema} = await getUsersMeMeta({
        baseUrl,
        url: resolveResourceEndpoint('usersMeMeta', configData),
        headers: {
          Authorization: `Bearer ${await this.getAccessToken(userId)}`,
        },
      });

      return schema ?? null;
    } catch (error) {
      return null;
    }
  }

  override async updateUserProfile(payload: any, userId?: string): Promise<User> {
    await this.ensureInitialized();

    try {
      const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
      const baseUrl: string | undefined = configData?.baseUrl;

      return updateMeProfile({
        baseUrl,
        url: resolveResourceEndpoint('usersMe', configData),
        headers: {
          Authorization: `Bearer ${await this.getAccessToken(userId)}`,
        },
        payload: payload?.payload ?? payload,
      });
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Failed to update user profile: ${error instanceof Error ? error.message : String(error)}`,
        'ThunderIDNextClient-UpdateProfileError-001',
        'react',
        'An error occurred while updating the user profile. Please check your configuration and network connection.',
      );
    }
  }

  /**
   * Updates one or more of the signed-in user's credentials (e.g. `password`, or any other
   * attribute the user type schema declares `credential: true`).
   *
   * Not part of {@link ThunderIDJavaScriptClient}'s base surface — unlike `updateUserProfile`,
   * no other SDK routes credential updates through a client method (React/Vue's
   * `ChangeCredential` call the core `updateMeCredentials` function directly), so this is a
   * Next.js-specific addition rather than an override. Kept here anyway so this SDK's own
   * server actions have one consistent way to reach every `/users/me/*` operation.
   *
   * Deliberately does not catch and rewrap errors the way `updateUserProfile` does: the caller
   * (`updateUserCredentialsAction`) needs the real `ThunderIDAPIError` instance, status code
   * included, to map a failure onto the right form field before it crosses the server action
   * boundary back to the client.
   */
  override async updateUserCredentials(payload: Record<string, string>, userId?: string): Promise<void> {
    await this.ensureInitialized();

    const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
    const baseUrl: string | undefined = configData?.baseUrl;

    await updateMeCredentials({
      baseUrl,
      url: resolveResourceEndpoint('usersMeCredentials', configData),
      headers: {
        Authorization: `Bearer ${await this.getAccessToken(userId)}`,
      },
      payload,
    });
  }

  override isLoading(): boolean {
    return false;
  }

  override isSignedIn(sessionId?: string): Promise<boolean> {
    return super.isSignedIn(sessionId);
  }

  override exchangeToken(config: TokenExchangeRequestConfig, sessionId?: string): Promise<TokenResponse | Response> {
    return super.exchangeToken(config, sessionId) as unknown as Promise<TokenResponse | Response>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override async getAccessToken(_sessionId?: string): Promise<string> {
    const {default: getAccessToken} = await import('./server/actions/getAccessToken');
    const token: string | undefined = await getAccessToken();

    if (typeof token !== 'string' || !token) {
      throw new ThunderIDRuntimeError(
        'Failed to get access token.',
        'ThunderIDNextClient-getAccessToken-RuntimeError-003',
        'nextjs',
        'An error occurred while obtaining the access token. Please check your configuration and network connection.',
      );
    }

    return token;
  }

  override async getDecodedIdToken(sessionId?: string, idToken?: string): Promise<IdToken> {
    await this.ensureInitialized();
    return await super.getDecodedIdToken(sessionId, idToken);
  }

  override async signIn(...args: any[]): Promise<any> {
    const arg1: any = args[0];
    const arg2: any = args[1];
    const arg3: any = args[2];
    const arg4: any = args[3];

    // An embedded sign-in flow payload initiates or continues a `POST /flow/execute` step
    // (identified by `applicationId` for a new flow or `executionId` to continue one). This is
    // distinct from the OAuth authorization_code exchange handled by `super.signIn` below, which
    // is used once the embedded flow completes and returns an authorization code.
    const isEmbeddedFlowPayload: boolean =
      typeof arg1 === 'object' && arg1 !== null && ('executionId' in arg1 || 'applicationId' in arg1);

    if (isEmbeddedFlowPayload) {
      await this.ensureInitialized();

      // Typed as the Next config rather than `AuthClientConfig<T>` because the server-only
      // `flowSecret` lives on `ThunderIDNodeConfig`, which the generic base config does not expose.
      const configData: ThunderIDNextConfig = (await this.getStorageManager().getConfigData()) as ThunderIDNextConfig;

      return executeEmbeddedSignInFlow({
        baseUrl: configData?.baseUrl,
        flowSecret: arg2?.flowSecret ?? configData?.flowSecret,
        payload: arg1,
        url: resolveResourceEndpoint('flowExecute', configData, arg2?.url),
      }) as unknown as Promise<EmbeddedSignInFlowResponse>;
    }

    return super.signIn(arg4, arg3, arg1?.code, arg1?.session_state, arg1?.state, arg1) as unknown as Promise<User>;
  }

  override async signOut(...args: any[]): Promise<string> {
    if (args[1] && typeof args[1] !== 'string') {
      throw new Error('The second argument must be a string.');
    }

    const config: T = this.getConfiguration();
    const afterSignOutUrl: string = config?.afterSignOutUrl || '/';

    const resolvedSessionId: string = args[1] || (await getSessionId())!;

    try {
      await (super.signOut as (...a: any[]) => Promise<string>)(resolvedSessionId);
    } catch (error) {
      const message: string = error instanceof Error ? error.message : String(error);

      if (
        !message.includes('end_session_endpoint') &&
        !message.includes('sign-out endpoint') &&
        !message.includes('Sign-out endpoint') &&
        !message.includes('Sign-out redirect URL')
      ) {
        throw error;
      }
    }

    return afterSignOutUrl;
  }

  override async signUp(_options?: SignUpOptions): Promise<void> {
    throw new ThunderIDRuntimeError(
      'Not implemented',
      'ThunderIDNextClient-ValidationError-002',
      'nextjs',
      'The signUp method is not implemented in the Next.js client.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override signInSilently(_options?: SignInOptions): Promise<User | boolean> {
    throw new ThunderIDRuntimeError(
      'Not implemented',
      'ThunderIDNextClient-signInSilently-NotImplementedError-001',
      'nextjs',
      'The signInSilently method is not implemented in the Next.js client.',
    );
  }

  public async getAuthorizeRequestUrl(
    customParams: ExtendedAuthorizeRequestUrlParams,
    userId?: string,
  ): Promise<string> {
    await this.ensureInitialized();
    return this.getSignInUrl(customParams, userId);
  }

  public override getStorageManager(): any {
    return super.getStorageManager();
  }

  public override async clearSession(): Promise<void> {
    throw new ThunderIDRuntimeError(
      'Not implemented',
      'ThunderIDNextClient-clearSession-NotImplementedError-001',
      'nextjs',
      'The clearSession method is not implemented in the Next.js client.',
    );
  }

  override async setSession(sessionData: Record<string, unknown>, sessionId?: string): Promise<void> {
    return this.getStorageManager().setSessionData(sessionData, sessionId);
  }

  override decodeJwtToken<R = Record<string, unknown>>(token: string): Promise<R> {
    return super.decodeJwtToken<R>(token);
  }
}

export default ThunderIDNextClient;
