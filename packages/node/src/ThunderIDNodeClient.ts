// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AuthClientConfig,
  ExtendedAuthorizeRequestUrlParams,
  IdToken,
  OIDCEndpoints,
  resolveResourceEndpoint,
  SessionData,
  Storage,
  ThunderIDAuthException,
  ThunderIDJavaScriptClient,
  TokenExchangeRequestConfig,
  TokenResponse,
  updateMeCredentials,
  User,
} from '@thunderid/javascript';
import AuthURLCallback from './models/AuthURLCallback';
import {ThunderIDNodeConfig} from './models/config';
import MemoryCacheStore from './stores/MemoryCacheStore';
import NodeCryptoUtils from './utils/NodeCryptoUtils';
import SessionUtils from './utils/SessionUtils';

class ThunderIDNodeClient<T extends ThunderIDNodeConfig = ThunderIDNodeConfig> extends ThunderIDJavaScriptClient<T> {
  private _nodeInstanceId = 0;

  public constructor(instanceId = 0) {
    super(undefined, new NodeCryptoUtils());
    this._nodeInstanceId = instanceId;
  }

  public override async initialize(config: T, storage?: Storage): Promise<boolean> {
    const merged = {...(config as any), instanceId: this._nodeInstanceId};
    const store: Storage = storage ?? new MemoryCacheStore();
    return super.initialize(merged as unknown as T, store);
  }

  public override getInstanceId(): number {
    return this._nodeInstanceId;
  }

  public override async signIn(...args: any[]): Promise<TokenResponse> {
    const [authURLCallback, userId, authorizationCode, sessionState, state, signInConfig] = args as [
      AuthURLCallback,
      string,
      string?,
      string?,
      string?,
      Record<string, string | boolean>?,
    ];
    if (!userId) {
      return Promise.reject(
        new ThunderIDAuthException(
          'NODE-AUTH_CLIENT-SI-NF01',
          'No user ID was provided.',
          'Unable to sign in the user as no user ID was provided.',
        ),
      );
    }

    if (await this.isSignedIn(userId)) {
      const sm = this.getStorageManager();
      const sessionData: SessionData = await sm.getSessionData(userId);
      return Promise.resolve({
        accessToken: sessionData.access_token,
        createdAt: sessionData.created_at,
        expiresIn: sessionData.expires_in,
        idToken: sessionData.id_token,
        refreshToken: sessionData.refresh_token ?? '',
        scope: sessionData.scope,
        tokenType: sessionData.token_type,
      });
    }

    if (!authorizationCode || !state) {
      if (!authURLCallback || typeof authURLCallback !== 'function') {
        return Promise.reject(
          new ThunderIDAuthException(
            'NODE-AUTH_CLIENT-SI-NF02',
            'Invalid AuthURLCallback function.',
            'The AuthURLCallback is not defined or is not a function.',
          ),
        );
      }
      const authURL: string = await this.getSignInUrl(signInConfig as any, userId);
      authURLCallback(authURL);
      return Promise.resolve({
        accessToken: '',
        createdAt: 0,
        expiresIn: '',
        idToken: '',
        refreshToken: '',
        scope: '',
        tokenType: '',
      });
    }

    await this.requestAccessToken(authorizationCode, sessionState ?? '', state, userId);
    const sm = this.getStorageManager();
    const sessionData: SessionData = await sm.getSessionData(userId);
    return Promise.resolve({
      accessToken: sessionData.access_token,
      createdAt: sessionData.created_at,
      expiresIn: sessionData.expires_in,
      idToken: sessionData.id_token,
      refreshToken: sessionData.refresh_token ?? '',
      scope: sessionData.scope,
      tokenType: sessionData.token_type,
    });
  }

  public override async getSignInUrl(
    requestConfig?: ExtendedAuthorizeRequestUrlParams,
    userId?: string,
  ): Promise<string> {
    const url = await super.getSignInUrl(requestConfig, userId);
    if (!url) {
      return Promise.reject(
        new ThunderIDAuthException(
          'NODE-AUTH_CLIENT-GSIU-NF01',
          'Getting authorization URL failed.',
          'No authorization URL was returned.',
        ),
      );
    }
    return url;
  }

  public override async signOut(...args: any[]): Promise<string> {
    const userId = typeof args[0] === 'string' ? args[0] : undefined;
    const signOutUrl = await this.getSignOutUrl(userId);
    if (!signOutUrl) {
      return Promise.reject(
        new ThunderIDAuthException(
          'NODE-AUTH_CLIENT-SO-NF01',
          'Signing out the user failed.',
          'Could not obtain the sign-out URL from the server.',
        ),
      );
    }
    return signOutUrl;
  }

  public override async isSignedIn(userId?: string): Promise<boolean> {
    try {
      if (!(await super.isSignedIn(userId))) {
        return false;
      }
      const sm = this.getStorageManager();
      const sessionData = await sm.getSessionData(userId);
      if (await SessionUtils.validateSession(sessionData)) {
        return true;
      }
      const refreshedToken = await this.refreshAccessToken(userId);
      if (refreshedToken) {
        return true;
      }
      await sm.removeSessionData(userId);
      return false;
    } catch {
      return false;
    }
  }

  public override async getIdToken(userId?: string): Promise<string> {
    if (!(await this.isSignedIn(userId))) {
      return Promise.reject(
        new ThunderIDAuthException(
          'NODE-AUTH_CLIENT-GIT-NF01',
          'The user is not logged in.',
          'No session was found for the requested user.',
        ),
      );
    }
    return super.getIdToken(userId);
  }

  public override async refreshAccessToken(userId?: string): Promise<TokenResponse | User> {
    return super.refreshAccessToken(userId);
  }

  public override async revokeAccessToken(userId?: string): Promise<Response | boolean> {
    return super.revokeAccessToken(userId);
  }

  public override async getDecodedIdToken(userId?: string, idToken?: string): Promise<IdToken> {
    return super.getDecodedIdToken(userId, idToken);
  }

  public override async getAccessToken(userId?: string): Promise<string> {
    return super.getAccessToken(userId);
  }

  public override async getUser(userId?: string): Promise<User> {
    return super.getUser(userId);
  }

  public override async getOpenIDProviderEndpoints(): Promise<Partial<OIDCEndpoints>> {
    return super.getOpenIDProviderEndpoints();
  }

  public override async exchangeToken(
    config: TokenExchangeRequestConfig,
    userId?: string,
  ): Promise<TokenResponse | Response | User> {
    return super.exchangeToken(config, userId);
  }

  /**
   * Updates one or more of the signed-in user's credentials (e.g. `password`, or any other
   * attribute the user type schema declares `credential: true`).
   */
  public async updateUserCredentials(payload: Record<string, string>, userId?: string): Promise<void> {
    const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
    const baseUrl: string | undefined = configData?.baseUrl;

    await updateMeCredentials({
      baseUrl,
      headers: {
        Authorization: `Bearer ${await this.getAccessToken(userId)}`,
      },
      payload,
      url: resolveResourceEndpoint('usersMeCredentials', configData),
    });
  }
}

export default ThunderIDNodeClient;
