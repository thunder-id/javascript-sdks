// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ThunderIDNodeClient,
  ThunderIDRuntimeError,
  executeEmbeddedSignInFlow,
  extractUserClaimsFromIdToken,
  generateFlattenedUserProfile,
  getUsersMe,
  getUsersMeMeta,
  isEmpty,
  resolveResourceEndpoint,
  updateMeCredentials,
  updateMeProfile,
  type AttributeSchema,
  type AuthClientConfig,
  type IdToken,
  type Storage,
  type TokenExchangeRequestConfig,
  type TokenResponse,
  type User,
  type UserProfile,
  type UpdateMeProfileConfig,
  type ExtendedAuthorizeRequestUrlParams,
  type SignUpOptions,
} from '@thunderid/node';
import type {ThunderIDNuxtConfig, ThunderIDSessionPayload} from '../types';

class ThunderIDNuxtClient extends ThunderIDNodeClient<ThunderIDNuxtConfig> {
  private static instance: ThunderIDNuxtClient;

  public isInitialized = false;

  private constructor() {
    super();
  }

  public static getInstance(): ThunderIDNuxtClient {
    if (!ThunderIDNuxtClient.instance) {
      ThunderIDNuxtClient.instance = new ThunderIDNuxtClient();
    }
    return ThunderIDNuxtClient.instance;
  }

  override async initialize(config: ThunderIDNuxtConfig, storage?: Storage): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    const authConfig: AuthClientConfig<ThunderIDNuxtConfig> = {
      afterSignInUrl: config.afterSignInUrl!,
      afterSignOutUrl: config.afterSignOutUrl || '/',
      baseUrl: config.baseUrl!,
      clientId: config.clientId!,
      clientSecret: config.clientSecret || undefined,
      enablePKCE: true,
      endpoints: config.endpoints,
      flowSecret: config.flowSecret || undefined,
      scopes: config.scopes || ['openid', 'profile'],
      tokenRequest: config.tokenRequest,
    } as AuthClientConfig<ThunderIDNuxtConfig>;

    const result: boolean = await super.initialize(authConfig as unknown as ThunderIDNuxtConfig, storage);
    this.isInitialized = true;
    return result;
  }

  override async reInitialize(config: Partial<ThunderIDNuxtConfig>): Promise<boolean> {
    await super.reInitialize(config as any);
    return true;
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

  override async signIn(...args: any[]): Promise<any> {
    const arg0: unknown = args[0];
    const arg1: unknown = args[1];

    // An embedded (app-native) sign-in flow payload initiates or continues a `POST /flow/execute`
    // step (identified by `applicationId` for a new flow or `executionId` to continue one). This
    // is distinct from the OAuth authorization_code exchange handled below, which is used once a
    // redirect-preceded flow completes and returns an authorization code.
    const isEmbeddedFlowPayload: boolean =
      typeof arg0 === 'object' &&
      arg0 !== null &&
      !isEmpty(arg0 as Record<string, unknown>) &&
      ('executionId' in (arg0 as object) || 'applicationId' in (arg0 as object));

    if (isEmbeddedFlowPayload) {
      const request: {flowSecret?: string; url?: string} =
        typeof arg1 === 'object' && arg1 !== null ? (arg1 as {flowSecret?: string; url?: string}) : {};
      const configData: ThunderIDNuxtConfig = (await this.getStorageManager().getConfigData()) as ThunderIDNuxtConfig;

      return executeEmbeddedSignInFlow({
        baseUrl: configData?.baseUrl,
        flowSecret: request.flowSecret ?? configData?.flowSecret,
        payload: arg0,
        url: resolveResourceEndpoint('flowExecute', configData, request.url),
      });
    }

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

      if (code) extraParams.code = code;
      if (sessionState) extraParams.session_state = sessionState;
      if (state) extraParams.state = state;

      return super.signIn(args[3], args[2], code, sessionState, state, extraParams);
    }

    return super.signIn(args[0], args[1], args[2], args[3], args[4], args[5]);
  }

  override async signUp(_options?: SignUpOptions): Promise<void> {
    return undefined;
  }

  public async getAuthorizeRequestUrl(
    customParams: ExtendedAuthorizeRequestUrlParams,
    userId?: string,
  ): Promise<string> {
    return this.getSignInUrl(customParams, userId);
  }

  override async signOut(...args: any[]): Promise<string> {
    const configData: any = this.getStorageManager().getConfigData();
    return (configData?.afterSignOutUrl as string) || (configData?.afterSignInUrl as string) || '/';
  }

  override async getUser(sessionId?: string): Promise<User> {
    try {
      const configData: AuthClientConfig<ThunderIDNuxtConfig> = await this.getStorageManager().getConfigData();
      const baseUrl: string | undefined = configData?.baseUrl;

      const profile: User = await getUsersMe({
        baseUrl,
        url: resolveResourceEndpoint('usersMe', configData),
        headers: {
          Authorization: `Bearer ${await this.getAccessToken(sessionId)}`,
        },
      });

      return profile;
    } catch (error) {
      return await super.getUser(sessionId);
    }
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

  override exchangeToken(config: TokenExchangeRequestConfig, sessionId?: string): Promise<TokenResponse | Response> {
    return super.exchangeToken(config, sessionId) as unknown as Promise<TokenResponse | Response>;
  }

  override async getUserProfile(sessionId?: string): Promise<UserProfile> {
    try {
      const configData: AuthClientConfig<ThunderIDNuxtConfig> = await this.getStorageManager().getConfigData();
      const baseUrl: string | undefined = configData?.baseUrl;

      const profile: User = await getUsersMe({
        baseUrl,
        url: resolveResourceEndpoint('usersMe', configData),
        headers: {
          Authorization: `Bearer ${await this.getAccessToken(sessionId)}`,
        },
      });

      return {
        flattenedProfile: generateFlattenedUserProfile(profile),
        profile,
      };
    } catch (error) {
      const claims = extractUserClaimsFromIdToken(await super.getDecodedIdToken(sessionId));
      return {
        flattenedProfile: claims,
        profile: claims,
      };
    }
  }

  override async updateUserProfile(config: UpdateMeProfileConfig, sessionId?: string): Promise<User> {
    try {
      const configData: AuthClientConfig<ThunderIDNuxtConfig> = await this.getStorageManager().getConfigData();
      const baseUrl: string | undefined = configData?.baseUrl;

      return updateMeProfile({
        baseUrl,
        url: resolveResourceEndpoint('usersMe', configData),
        headers: {
          Authorization: `Bearer ${await this.getAccessToken(sessionId)}`,
        },
        payload: (config as any)?.payload ?? config,
      });
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Failed to update user profile: ${error instanceof Error ? error.message : String(error)}`,
        'ThunderIDNuxtClient-UpdateProfileError-001',
        'nuxt',
        'An error occurred while updating the user profile. Please check your configuration and network connection.',
      );
    }
  }

  /**
   * Updates one or more of the signed-in user's credentials (e.g. `password`, or any other
   * attribute the user type schema declares `credential: true`).
   *
   * Deliberately does not catch and rewrap errors the way `updateUserProfile` does: the caller
   * (the `PATCH /api/auth/user/credentials` Nitro route) needs the real `ThunderIDAPIError`
   * instance, status code included, to map a failure onto the right form field.
   */
  async updateUserCredentials(payload: Record<string, string>, sessionId?: string): Promise<void> {
    const configData: AuthClientConfig<ThunderIDNuxtConfig> = await this.getStorageManager().getConfigData();
    const baseUrl: string | undefined = configData?.baseUrl;

    await updateMeCredentials({
      baseUrl,
      url: resolveResourceEndpoint('usersMeCredentials', configData),
      headers: {
        Authorization: `Bearer ${await this.getAccessToken(sessionId)}`,
      },
      payload,
    });
  }

  async getUserSchema(sessionId?: string): Promise<Record<string, AttributeSchema> | null> {
    const configData: AuthClientConfig<ThunderIDNuxtConfig> = await this.getStorageManager().getConfigData();
    const baseUrl: string | undefined = configData?.baseUrl;

    const metaRes = await getUsersMeMeta({
      baseUrl,
      url: resolveResourceEndpoint('usersMeMeta', configData),
      headers: {
        Authorization: `Bearer ${await this.getAccessToken(sessionId)}`,
      },
    });

    return metaRes?.schema ?? null;
  }

  public override getStorageManager(): any {
    return super.getStorageManager();
  }
}

export default ThunderIDNuxtClient;
