/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

  override exchangeToken(config: TokenExchangeRequestConfig, sessionId?: string): Promise<TokenResponse | Response> {
    return super.exchangeToken(config, sessionId) as unknown as Promise<TokenResponse | Response>;
  }

  override async getUserProfile(sessionId: string): Promise<UserProfile> {
    const user: User = await this.getUser(sessionId);
    return {flattenedProfile: user, profile: user};
  }

  override async updateUserProfile(config: UpdateMeProfileConfig, sessionId: string): Promise<User> {
    throw new Error('Profile updates are not supported for the ThunderID platform.');
  }

  public override getStorageManager(): any {
    return super.getStorageManager();
  }
}

export default ThunderIDNuxtClient;
