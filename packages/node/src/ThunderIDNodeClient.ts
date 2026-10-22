// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AuthClientConfig,
  BackchannelLogoutConstants,
  BackchannelLogoutResult,
  ExtendedAuthorizeRequestUrlParams,
  getFlows,
  getUsers,
  getUserTypes,
  IdToken,
  InvalidLogoutTokenError,
  logger,
  LogoutTokenClaims,
  ManagedFlowListResponse,
  ManagedUserListResponse,
  ManagedUserTypeListResponse,
  OIDCEndpoints,
  resolveResourceEndpoint,
  SessionData,
  Storage,
  ThunderIDAuthException,
  ThunderIDJavaScriptClient,
  TokenExchangeRequestConfig,
  ThunderIDRuntimeError,
  TokenResponse,
  updateMeCredentials,
  User,
} from '@thunderid/javascript';
import AuthURLCallback from './models/AuthURLCallback';
import {ThunderIDNodeConfig} from './models/config';
import {ManagementResourceKey, ThunderIDNodeManagementClient} from './models/management';
import MemoryCacheStore from './stores/MemoryCacheStore';
import createManagementClient from './utils/createManagementClient';
import NodeCryptoUtils from './utils/NodeCryptoUtils';
import SessionIndex, {IndexedSessions, SessionBinding} from './utils/SessionIndex';

class ThunderIDNodeClient<T extends ThunderIDNodeConfig = ThunderIDNodeConfig> extends ThunderIDJavaScriptClient<T> {
  private _nodeInstanceId = 0;

  // Logout tokens already handled, by `jti`, with the time each expires in milliseconds.
  private _handledLogoutTokens: Map<string, number> = new Map<string, number>();

  // Refreshes in progress, by session, so concurrent callers share one.
  private _refreshesInFlight: Map<string, Promise<TokenResponse | User>> = new Map<
    string,
    Promise<TokenResponse | User>
  >();

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
    const [authURLCallback, userId, authorizationCode, state, signInConfig] = args as [
      AuthURLCallback,
      string,
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

    await this.requestAccessToken(authorizationCode, state, userId);
    const sm = this.getStorageManager();
    const sessionData: SessionData = await sm.getSessionData(userId);
    await this.indexSession(userId, sessionData);
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

  /**
   * Handles an OpenID Connect back-channel logout: validates the logout token the server posted,
   * then ends every local session it names. A token with a `sid` ends the sessions that joined
   * that server session. A token with only a `sub` ends that subject's sessions that began before
   * the token was issued, so a user who has already signed in again stays signed in.
   *
   * Ending a session here is local. The server has already revoked the tokens, so nothing is sent
   * to it. A valid token that names no session held here succeeds with `sessionsEnded: 0`, which
   * keeps a retried notification harmless.
   *
   * @param logoutToken - The raw `logout_token` form parameter.
   * @returns The `sid` and `sub` the token named, when it was issued, and how many sessions were ended.
   * @throws {InvalidLogoutTokenError} When the token is not valid or was already handled.
   */
  public async handleBackchannelLogout(logoutToken: string): Promise<BackchannelLogoutResult> {
    const claims: LogoutTokenClaims = await this.validateLogoutToken(logoutToken);

    this.assertNotReplayed(claims);

    const index: SessionIndex<T> = new SessionIndex<T>(this.getStorageManager());
    let sessions: IndexedSessions;

    if (claims.sid) {
      sessions = await index.findBySid(claims.sid);
    } else {
      // The token's time is in whole seconds, and the clocks may differ by the tolerance. Erring
      // that way ends a session that began just after the logout, which is the safer mistake.
      const tolerance: number =
        (await this.getStorageManager().getConfigData())?.tokenValidation?.idToken?.clockTolerance ??
        BackchannelLogoutConstants.DEFAULT_CLOCK_TOLERANCE_SECONDS;
      const issuedBefore: number = (claims.iat + 1 + tolerance) * 1000;

      sessions = Object.fromEntries(
        Object.entries(await index.findBySub(claims.sub!)).filter(
          ([, startedAt]: [string, number]) => startedAt < issuedBefore,
        ),
      );
    }

    let sessionsEnded = 0;

    // One at a time: sessions of one subject share an index entry, and each removal rewrites it.
    await Object.keys(sessions).reduce(async (previous: Promise<void>, sessionId: string): Promise<void> => {
      await previous;

      const stored: SessionBinding = await this.readSessionBinding(sessionId);

      // An application may reuse a session id for a new sign-in. The index entry then names a
      // session that belongs to another server session or subject, and that one is left alone.
      if (
        (stored.sid && claims.sid && stored.sid !== claims.sid) ||
        (stored.sub && claims.sub && stored.sub !== claims.sub)
      ) {
        await index.remove(sessionId, {sid: claims.sid, sub: claims.sub});

        return;
      }

      await this.clearSessionAsync(sessionId);
      await index.remove(sessionId, {sid: claims.sid, sub: claims.sub, ...stored});
      sessionsEnded += 1;
    }, Promise.resolve());

    this.rememberHandled(claims);

    return {issuedAt: claims.iat, sessionsEnded, sid: claims.sid, sub: claims.sub};
  }

  /**
   * Removes a session's index entries. Called wherever the stored session is removed, so the index
   * does not keep growing: nothing else removes an entry once its session is gone. Sign-out does
   * not remove the stored session, so it keeps the entry: the back-channel logout that follows
   * finds the session through it.
   */
  private async forgetSession(sessionId?: string, sessionData?: SessionData): Promise<void> {
    try {
      const binding: SessionBinding = await this.readSessionBinding(sessionId ?? '', sessionData);

      if (binding.sid || binding.sub) {
        await new SessionIndex<T>(this.getStorageManager()).remove(sessionId ?? '', binding);
      }
    } catch {
      logger.warn('Could not remove the session from the back-channel logout index.');
    }
  }

  public override clearSession(sessionId?: string): void {
    void this.clearSessionAsync(sessionId);
  }

  protected override async clearSessionAsync(sessionId?: string): Promise<void> {
    await this.forgetSession(sessionId);
    await super.clearSessionAsync(sessionId);
  }

  /**
   * Records a new session against the `sid` and `sub` of its ID token, so a back-channel logout
   * can find it. Sign-in does not depend on it, so a failure here is logged and not raised.
   */
  private async indexSession(sessionId: string, sessionData: SessionData): Promise<void> {
    try {
      const binding: SessionBinding = await this.readSessionBinding(sessionId, sessionData);

      if (binding.sid || binding.sub) {
        await new SessionIndex<T>(this.getStorageManager()).add(sessionId, binding, Date.now());
      }
    } catch {
      logger.warn('Could not index the session for back-channel logout.');
    }
  }

  private async readSessionBinding(sessionId: string, sessionData?: SessionData): Promise<SessionBinding> {
    const idToken: string | undefined = (sessionData ?? (await this.getStorageManager().getSessionData(sessionId)))
      ?.id_token;

    if (!idToken) {
      return {};
    }

    const {sid, sub}: IdToken = await this.decodeJwtToken<IdToken>(idToken);

    return {
      ...(typeof sid === 'string' && sid ? {sid} : {}),
      ...(typeof sub === 'string' && sub ? {sub} : {}),
    };
  }

  /**
   * Refuses a logout token whose `jti` was already handled. Kept in this process only, so it is
   * a best effort across instances; a replay still cannot end a session that began after it.
   */
  private assertNotReplayed(claims: LogoutTokenClaims): void {
    const now: number = Date.now();

    this._handledLogoutTokens.forEach((expiresAt: number, jti: string): void => {
      if (expiresAt <= now) {
        this._handledLogoutTokens.delete(jti);
      }
    });

    if (this._handledLogoutTokens.has(claims.jti)) {
      throw new InvalidLogoutTokenError('NODE-AUTH_CLIENT-HBL-IV01', 'The logout token was already handled.');
    }
  }

  // Recorded once the sessions are ended, so a retry after a failure is not refused as a replay.
  private rememberHandled(claims: LogoutTokenClaims): void {
    this._handledLogoutTokens.set(claims.jti, claims.exp * 1000);
  }

  /**
   * Whether the session holds a valid access token. An expired access token is refreshed when the
   * session holds a refresh token. A session whose access token expired and cannot be refreshed is
   * removed.
   */
  public override async isSignedIn(userId?: string): Promise<boolean> {
    try {
      // The parent answers for an unexpired access token, and gets a new one for a
      // client_credentials client.
      if (await super.isSignedIn(userId)) {
        return true;
      }

      const sm = this.getStorageManager();
      const sessionData: SessionData = await sm.getSessionData(userId);

      if (!sessionData?.access_token) {
        return false;
      }

      if (sessionData.refresh_token) {
        try {
          await this.refreshAccessToken(userId);

          return true;
        } catch (error: unknown) {
          logger.debug('The expired session could not be refreshed, so it is removed.', error);
        }
      }

      await this.forgetSession(userId, sessionData);
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

  /**
   * Refreshes the session's tokens. Concurrent calls for one session share a single request, so a
   * rotated refresh token is not sent twice.
   */
  public override async refreshAccessToken(userId?: string): Promise<TokenResponse | User> {
    const key: string = userId ?? '';
    const inFlight: Promise<TokenResponse | User> | undefined = this._refreshesInFlight.get(key);

    if (inFlight) {
      return inFlight;
    }

    const refresh: Promise<TokenResponse | User> = (async (): Promise<TokenResponse | User> => {
      // A process can serve a stored session before any call loaded the discovery document.
      await this.loadOpenIDProviderConfiguration(false);

      return super.refreshAccessToken(userId);
    })().finally((): void => {
      this._refreshesInFlight.delete(key);
    });

    this._refreshesInFlight.set(key, refresh);

    return refresh;
  }

  public override async revokeAccessToken(userId?: string): Promise<Response | boolean> {
    // The base class clears the session itself, so the index entries go first.
    await this.forgetSession(userId);

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

  /**
   * The URL inputs and bearer token for a management request made on behalf of the session identified by
   * `userId`. The access token stays on the server.
   */
  private async managementRequestConfig(
    key: 'flows' | 'users' | 'userTypes',
    userId?: string,
  ): Promise<{baseUrl: string | undefined; headers: {Authorization: string}; url: string | undefined}> {
    const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();

    return {
      baseUrl: configData?.baseUrl,
      headers: {
        Authorization: `Bearer ${await this.getAccessToken(userId)}`,
      },
      url: resolveResourceEndpoint(key, configData),
    };
  }

  /**
   * Returns the management operations (users, groups, roles, agents, and their sub-resources) bound
   * to the session identified by `sessionId`.
   *
   * Every request is authorized with that session's access token, read at the time of each call; the
   * token is never copied onto the returned object or exposed to the caller. Whether a call succeeds
   * is the server's decision: the token needs the permissions the server requires for that resource.
   *
   * The collection URL comes from, in order: the `url` passed to the call, then `endpoints.<resource>`
   * in the configuration, then `{baseUrl}/{collection}`.
   *
   * @param sessionId - The session whose access token authorizes the requests.
   * @returns The session-bound management client.
   * @throws {ThunderIDRuntimeError} `NODE-MANAGEMENT-RC-NF01`, from an operation, when the session
   *   has no access token. Raised before any request is sent.
   * @throws {ThunderIDAPIError} From an operation, when the server rejects the request. HTTP 403 and
   *   404 surface as `<operation>-ForbiddenError-001` and `<operation>-NotFoundError-001`.
   *
   * @example
   * ```typescript
   * const admin = client.management(sessionId);
   * const {users, totalResults} = await admin.users.list({limit: 20});
   * await admin.groups.addMembers(groupId, [{id: users[0].id, type: 'user'}]);
   * ```
   */
  public management(sessionId?: string): ThunderIDNodeManagementClient {
    return createManagementClient((key: ManagementResourceKey, explicitUrl?: string) =>
      this.sessionManagementRequestConfig(key, sessionId, explicitUrl),
    );
  }

  /**
   * The URL inputs and bearer token for a management request made through {@link management}. Unlike
   * {@link managementRequestConfig}, a session without an access token is refused here rather than
   * sent to the server with an empty credential.
   */
  private async sessionManagementRequestConfig(
    key: ManagementResourceKey,
    sessionId?: string,
    explicitUrl?: string,
  ): Promise<{baseUrl: string | undefined; headers: {Authorization: string}; url: string | undefined}> {
    const configData: AuthClientConfig<T> = await this.getStorageManager().getConfigData();
    const accessToken: string | undefined = await this.getAccessToken(sessionId);

    if (!accessToken) {
      throw new ThunderIDRuntimeError(
        'No access token is available for the session. Sign in before calling a management operation.',
        'NODE-MANAGEMENT-RC-NF01',
        'node',
      );
    }

    return {
      baseUrl: configData?.baseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      url: resolveResourceEndpoint(key, configData, explicitUrl),
    };
  }

  /**
   * Retrieves one page of the user directory on behalf of the session identified by `userId`.
   *
   * Makes a single request and does not follow `links`. The access token stays on the server.
   */
  public async getUsers(
    options: {filter?: string; limit?: number; offset?: number; signal?: AbortSignal} = {},
    userId?: string,
  ): Promise<ManagedUserListResponse> {
    return getUsers({...options, ...(await this.managementRequestConfig('users', userId))});
  }

  /**
   * Retrieves one page of flows on behalf of the session identified by `userId`.
   *
   * Makes a single request and does not follow `links`. The access token stays on the server.
   */
  public async getFlows(
    options: {flowType?: string; limit?: number; offset?: number; signal?: AbortSignal} = {},
    userId?: string,
  ): Promise<ManagedFlowListResponse> {
    return getFlows({...options, ...(await this.managementRequestConfig('flows', userId))});
  }

  /**
   * Retrieves one page of user types on behalf of the session identified by `userId`.
   *
   * Makes a single request and does not follow `links`. The access token stays on the server.
   */
  public async getUserTypes(
    options: {limit?: number; offset?: number; signal?: AbortSignal} = {},
    userId?: string,
  ): Promise<ManagedUserTypeListResponse> {
    return getUserTypes({...options, ...(await this.managementRequestConfig('userTypes', userId))});
  }
}

export default ThunderIDNodeClient;
