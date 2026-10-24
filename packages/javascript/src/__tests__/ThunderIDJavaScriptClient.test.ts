// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import type {Config} from '../models/config';
import type {Crypto} from '../models/crypto';
import type {AuthorizationDetail, ExtendedAuthorizeRequestUrlParams} from '../models/oauth-request';
import type {SessionData, UserSession} from '../models/session';
import type {Storage} from '../models/store';
import type {TokenResponse} from '../models/token';
import type StorageManager from '../StorageManager';
import ThunderIDJavaScriptClient from '../ThunderIDJavaScriptClient';

vi.mock('../IsomorphicCrypto', () => ({
  IsomorphicCrypto: class MockIsomorphicCrypto {
    constructor(_cryptoUtils: unknown) {}
    generateState(): string {
      return 'randomstate';
    }
  },
}));

const mockHandleTokenResponse = vi.fn();

vi.mock('../utils/AuthenticationHelper', () => ({
  default: class MockAuthenticationHelper {
    constructor(_storage: unknown, _crypto: unknown) {}
    handleTokenResponse = mockHandleTokenResponse;
  },
}));

class MemoryStore implements Storage {
  private store = new Map<string, string>();

  async getData(key: string): Promise<string> {
    return this.store.get(key) ?? null!;
  }

  async setData(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeData(key: string): Promise<void> {
    this.store.delete(key);
  }
}

async function getStoredConfig(client: ThunderIDJavaScriptClient): Promise<Record<string, any>> {
  return (client as any).storageManager.getConfigData();
}

const BASE_CONFIG = {baseUrl: 'https://example.com', clientId: 'test-client', clientSecret: 'test-secret'} as any;

const OIDC_META = {
  backchannel_authentication_endpoint: 'https://example.com/oauth2/bc-authorize',
  token_endpoint: 'https://example.com/oauth2/token',
};

async function initClientWithOIDC(store: MemoryStore): Promise<ThunderIDJavaScriptClient> {
  const client = new ThunderIDJavaScriptClient(store, {} as any);
  await client.initialize(BASE_CONFIG);
  const sm = (client as any).storageManager;
  await sm.setOIDCProviderMetaData(OIDC_META);
  await sm.setTemporaryDataParameter('op_config_initiated', true);
  return client;
}

function mockFetchOnce(body: unknown, ok = true, status = 200): void {
  const serialized = typeof body === 'string' ? body : JSON.stringify(body);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(serialized),
      ok,
      status,
      statusText: ok ? 'OK' : 'Bad Request',
    }),
  );
}

describe('ThunderIDJavaScriptClient', () => {
  let store: MemoryStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new MemoryStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initialize()', () => {
    it('should apply DEFAULT_CONFIG baseline when no overrides are provided', async () => {
      const client = new ThunderIDJavaScriptClient(store, {} as any);

      await client.initialize({baseUrl: 'https://example.com', clientId: 'test-client'} as any);

      const config = await getStoredConfig(client);

      expect(config['enablePKCE']).toBe(true);
      expect(config['sendCookiesInRequests']).toBe(true);
      expect(config['tokenValidation'].idToken.clockTolerance).toBe(300);
      expect(config['tokenValidation'].idToken.validate).toBe(true);
      expect(config['tokenValidation'].idToken.validateIssuer).toBe(true);
    });

    it('should deep-merge partial tokenValidation, preserving sibling defaults', async () => {
      const client = new ThunderIDJavaScriptClient(store, {} as any);

      await client.initialize({
        baseUrl: 'https://example.com',
        clientId: 'test-client',
        tokenValidation: {idToken: {validate: false}},
      } as any);

      const config = await getStoredConfig(client);

      expect(config['tokenValidation'].idToken.validate).toBe(false);
      expect(config['tokenValidation'].idToken.clockTolerance).toBe(300);
      expect(config['tokenValidation'].idToken.validateIssuer).toBe(true);
    });

    it('should allow individual tokenValidation fields to be overridden independently', async () => {
      const client = new ThunderIDJavaScriptClient(store, {} as any);

      await client.initialize({
        baseUrl: 'https://example.com',
        clientId: 'test-client',
        tokenValidation: {idToken: {clockTolerance: 60}},
      } as any);

      const config = await getStoredConfig(client);

      expect(config['tokenValidation'].idToken.clockTolerance).toBe(60);
      expect(config['tokenValidation'].idToken.validate).toBe(true);
      expect(config['tokenValidation'].idToken.validateIssuer).toBe(true);
    });

    it('should set explicit fields (applicationId, scope) at highest precedence', async () => {
      const client = new ThunderIDJavaScriptClient(store, {} as any);

      await client.initialize({
        applicationId: 'app-123',
        baseUrl: 'https://example.com',
        clientId: 'test-client',
        scopes: ['openid', 'profile'],
      } as any);

      const config = await getStoredConfig(client);

      expect(config['applicationId']).toBe('app-123');
      expect(config['scope']).toContain('openid');
    });
  });

  describe('initiateCIBA()', () => {
    it('should throw when backchannel_authentication_endpoint is absent from OIDC metadata', async () => {
      const client = new ThunderIDJavaScriptClient(store, {} as any);
      await client.initialize(BASE_CONFIG);
      const sm = (client as any).storageManager;
      await sm.setOIDCProviderMetaData({token_endpoint: 'https://example.com/oauth2/token'});
      await sm.setTemporaryDataParameter('op_config_initiated', true);

      await expect(client.initiateCIBA({loginHint: 'user@example.com'})).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CIBA1-NF01',
      });
    });

    it('should throw when no hint is provided', async () => {
      const client = await initClientWithOIDC(store);

      await expect(client.initiateCIBA({})).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CIBA1-IV01',
      });
    });

    it('should throw when multiple hints are provided', async () => {
      const client = await initClientWithOIDC(store);

      await expect(client.initiateCIBA({loginHint: 'user@example.com', idTokenHint: 'id-token'})).rejects.toMatchObject(
        {code: 'JS-AUTH_CORE-CIBA1-IV02'},
      );
    });

    it('should throw when the server returns a non-ok response', async () => {
      const client = await initClientWithOIDC(store);
      mockFetchOnce({error: 'invalid_request'}, false, 400);

      await expect(client.initiateCIBA({loginHint: 'user@example.com'})).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CIBA1-HE03',
        statusCode: 400,
      });
    });

    it('should throw when the server response is missing auth_req_id', async () => {
      const client = await initClientWithOIDC(store);
      mockFetchOnce({expires_in: 120, interval: 5});

      await expect(client.initiateCIBA({loginHint: 'user@example.com'})).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CIBA1-PR04',
      });
    });

    it('should return authReqId, interval, and expiresIn on success', async () => {
      const client = await initClientWithOIDC(store);
      mockFetchOnce({auth_req_id: 'req-123', expires_in: 300, interval: 5});

      const result = await client.initiateCIBA({loginHint: 'user@example.com'});

      expect(result).toEqual({authReqId: 'req-123', expiresIn: 300, interval: 5});
    });

    it('should default interval to 5 and expiresIn to 120 when server omits them', async () => {
      const client = await initClientWithOIDC(store);
      mockFetchOnce({auth_req_id: 'req-456'});

      const result = await client.initiateCIBA({loginHint: 'user@example.com'});

      expect(result.interval).toBe(5);
      expect(result.expiresIn).toBe(120);
    });

    it('should send Authorization: Basic header when using client_secret_basic', async () => {
      const client = await initClientWithOIDC(store);
      const fetchMock = vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({auth_req_id: 'req-789', expires_in: 120, interval: 5}),
        text: () => Promise.resolve(JSON.stringify({auth_req_id: 'req-789', expires_in: 120, interval: 5})),
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      vi.stubGlobal('fetch', fetchMock);

      await client.initiateCIBA({bindingMessage: 'Approve login', loginHint: 'user@example.com'});

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.Authorization).toMatch(/^Basic /);
      const body: URLSearchParams = init.body;
      expect(body.has('client_secret')).toBe(false);
    });

    it('should send client_secret in body and no Authorization header when using client_secret_post', async () => {
      const client = new ThunderIDJavaScriptClient(store, {} as any);
      await client.initialize({...BASE_CONFIG, tokenRequest: {authMethod: 'client_secret_post'}});
      const sm = (client as any).storageManager;
      await sm.setOIDCProviderMetaData(OIDC_META);
      await sm.setTemporaryDataParameter('op_config_initiated', true);

      const fetchMock = vi.fn().mockResolvedValueOnce({
        json: () => Promise.resolve({auth_req_id: 'req-post', expires_in: 120, interval: 5}),
        text: () => Promise.resolve(JSON.stringify({auth_req_id: 'req-post', expires_in: 120, interval: 5})),
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      vi.stubGlobal('fetch', fetchMock);

      await client.initiateCIBA({loginHint: 'user@example.com'});

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.Authorization).toBeUndefined();
      const body: URLSearchParams = init.body;
      expect(body.get('client_secret')).toBe('test-secret');
    });
  });

  describe('pollCIBA()', () => {
    it('should throw when token_endpoint is absent from OIDC metadata', async () => {
      const client = new ThunderIDJavaScriptClient(store, {} as any);
      await client.initialize(BASE_CONFIG);
      const sm = (client as any).storageManager;
      await sm.setOIDCProviderMetaData({
        backchannel_authentication_endpoint: 'https://example.com/oauth2/bc-authorize',
      });
      await sm.setTemporaryDataParameter('op_config_initiated', true);

      await expect(client.pollCIBA('req-123', 5)).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CIBA2-NF01',
      });
    });

    it('should resolve with TokenResponse when the server approves on the first poll', async () => {
      const client = await initClientWithOIDC(store);
      const tokenResponse = {access_token: 'tok', expires_in: 3600};
      mockHandleTokenResponse.mockResolvedValueOnce(tokenResponse);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce({
          json: () => Promise.resolve(tokenResponse),
          ok: true,
          status: 200,
          statusText: 'OK',
        }),
      );

      const result = await client.pollCIBA('req-123', 0);

      expect(result).toBe(tokenResponse);
      expect(mockHandleTokenResponse).toHaveBeenCalledOnce();
    });

    it('should retry on authorization_pending and resolve on subsequent approval', async () => {
      const client = await initClientWithOIDC(store);
      const tokenResponse = {access_token: 'tok', expires_in: 3600};
      mockHandleTokenResponse.mockResolvedValueOnce(tokenResponse);

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({error: 'authorization_pending'}),
          text: () => Promise.resolve(JSON.stringify({error: 'authorization_pending'})),
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve(tokenResponse),
          text: () => Promise.resolve(JSON.stringify(tokenResponse)),
          ok: true,
          status: 200,
          statusText: 'OK',
        });
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.pollCIBA('req-123', 0);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result).toBe(tokenResponse);
    });

    it('should increase interval by 5 on slow_down and continue polling', async () => {
      const client = await initClientWithOIDC(store);
      const tokenResponse = {access_token: 'tok', expires_in: 3600};
      mockHandleTokenResponse.mockResolvedValueOnce(tokenResponse);

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({error: 'slow_down'}),
          text: () => Promise.resolve(JSON.stringify({error: 'slow_down'})),
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve(tokenResponse),
          text: () => Promise.resolve(JSON.stringify(tokenResponse)),
          ok: true,
          status: 200,
          statusText: 'OK',
        });
      vi.stubGlobal('fetch', fetchMock);

      const delays: number[] = [];
      vi.stubGlobal('setTimeout', (fn: () => void, ms: number) => {
        delays.push(ms);
        fn();
        return 0;
      });

      await client.pollCIBA('req-123', 2);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(delays[0]).toBe(2000);
      expect(delays[1]).toBe(7000);
    });

    it('should throw on expired_token', async () => {
      const client = await initClientWithOIDC(store);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce({
          json: () => Promise.resolve({error: 'expired_token'}),
          text: () => Promise.resolve(JSON.stringify({error: 'expired_token'})),
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        }),
      );

      await expect(client.pollCIBA('req-123', 0)).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CIBA2-HE03',
      });
    });

    it('should throw on access_denied', async () => {
      const client = await initClientWithOIDC(store);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce({
          json: () => Promise.resolve({error: 'access_denied'}),
          text: () => Promise.resolve(JSON.stringify({error: 'access_denied'})),
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        }),
      );

      await expect(client.pollCIBA('req-123', 0)).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CIBA2-HE03',
      });
    });

    it('should throw immediately when AbortSignal is already aborted', async () => {
      const client = await initClientWithOIDC(store);
      const controller = new AbortController();
      controller.abort();

      await expect(client.pollCIBA('req-123', 0, {signal: controller.signal})).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CIBA2-AB05',
      });
    });

    it('should abort mid-sleep and reject without waiting for the full interval', async () => {
      const client = await initClientWithOIDC(store);
      const controller = new AbortController();

      // Abort after a short delay while pollCIBA is sleeping before its first poll
      const abortTimer = globalThis.setTimeout(() => controller.abort(), 10);

      try {
        await expect(client.pollCIBA('req-123', 60, {signal: controller.signal})).rejects.toMatchObject({
          code: 'JS-AUTH_CORE-CIBA2-AB05',
        });
      } finally {
        globalThis.clearTimeout(abortTimer);
      }
    });
  });

  describe('authorization details', () => {
    const AUTHORIZE = 'https://example.com/oauth2/authorize';
    const PAYMENT: AuthorizationDetail = {
      actions: ['initiate'],
      instructedAmount: {amount: '20', currency: 'EUR'},
      type: 'payment',
    };
    const ACCOUNT: AuthorizationDetail = {type: 'account_information'};

    class AuthorizationDetailsClient extends ThunderIDJavaScriptClient {
      public buildSignInUrl(requestConfig?: ExtendedAuthorizeRequestUrlParams): Promise<string> {
        return this.getSignInUrl(requestConfig);
      }

      public fetchClientCredentialsToken(): Promise<TokenResponse> {
        return this.requestClientCredentialsToken();
      }

      public readUserSession(): Promise<UserSession> {
        return this.getUserSession();
      }

      public storage(): StorageManager<Config> {
        return this.getStorageManager();
      }
    }

    async function initWith(overrides: Partial<Config>): Promise<AuthorizationDetailsClient> {
      const client = new AuthorizationDetailsClient(store, {} as Crypto);
      await client.initialize({
        afterSignInUrl: 'https://app.example.com/callback',
        baseUrl: 'https://example.com',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        enablePKCE: false,
        ...overrides,
      });
      await client.storage().setOIDCProviderMetaData({...OIDC_META, authorization_endpoint: AUTHORIZE});
      await client.storage().setTemporaryDataParameter('op_config_initiated', true);
      return client;
    }

    const tokenRequestBody = (): URLSearchParams => vi.mocked(fetch).mock.calls[0][1]!.body as URLSearchParams;

    const authorizationDetailsOf = (url: string): unknown =>
      JSON.parse(new URL(url).searchParams.get('authorization_details') ?? 'null');

    it('sends the configured authorization details JSON-encoded on the authorize request', async () => {
      const client = await initWith({authorizationDetails: [PAYMENT]});

      expect(authorizationDetailsOf(await client.buildSignInUrl())).toEqual([PAYMENT]);
    });

    it('lets the authorization details of a sign-in call take precedence over the configured ones', async () => {
      const client = await initWith({authorizationDetails: [PAYMENT]});

      const url = await client.buildSignInUrl({authorizationDetails: [ACCOUNT]});

      expect(authorizationDetailsOf(url)).toEqual([ACCOUNT]);
      expect(new URL(url).searchParams.has('authorizationDetails')).toBe(false);
    });

    it('sends no authorization details when none are configured or requested', async () => {
      const client = await initWith({});

      expect(new URL(await client.buildSignInUrl()).searchParams.has('authorization_details')).toBe(false);
    });

    it('sends the configured authorization details on a client credentials token request and returns the granted ones', async () => {
      const client = await initWith({authorizationDetails: [PAYMENT], grantType: 'client_credentials'});
      mockFetchOnce({access_token: 'm2m-token', authorization_details: [PAYMENT], expires_in: '3600'});

      const response = await client.fetchClientCredentialsToken();

      expect(JSON.parse(tokenRequestBody().get('authorization_details') ?? 'null')).toEqual([PAYMENT]);
      expect(response.authorizationDetails).toEqual([PAYMENT]);
    });

    it('sends no authorization details on a client credentials token request when none are configured', async () => {
      const client = await initWith({grantType: 'client_credentials'});
      mockFetchOnce({access_token: 'm2m-token', expires_in: '3600'});

      const response = await client.fetchClientCredentialsToken();

      expect(tokenRequestBody().has('authorization_details')).toBe(false);
      expect(response.authorizationDetails).toBeUndefined();
    });

    it('exposes the granted authorization details on the user session', async () => {
      const client = await initWith({});
      await client.storage().setSessionData({authorization_details: [ACCOUNT], scope: 'openid'} as SessionData);

      expect(await client.readUserSession()).toEqual({authorizationDetails: [ACCOUNT], scopes: ['openid']});
    });
  });

  describe('getSignOutUrl()', () => {
    const END_SESSION = 'https://example.com/oauth2/logout';

    async function initForSignOut(
      overrides: Record<string, unknown>,
      meta: Record<string, unknown> = {end_session_endpoint: END_SESSION},
    ): Promise<ThunderIDJavaScriptClient> {
      const client = new ThunderIDJavaScriptClient(store, {} as any);
      await client.initialize({...BASE_CONFIG, afterSignOutUrl: 'https://example.com/console', ...overrides});
      const sm = (client as any).storageManager;
      await sm.setOIDCProviderMetaData(meta);
      await sm.setTemporaryDataParameter('op_config_initiated', true);
      return client;
    }

    it('includes id_token_hint and post_logout_redirect_uri when sendIdTokenInLogoutRequest is true', async () => {
      const client = await initForSignOut({sendIdTokenInLogoutRequest: true});
      await (client as any).storageManager.setSessionData({id_token: 'test-id-token'});

      const url = new URL(await (client as any).getSignOutUrl());

      expect(`${url.origin}${url.pathname}`).toBe(END_SESSION);
      expect(url.searchParams.get('id_token_hint')).toBe('test-id-token');
      expect(url.searchParams.get('post_logout_redirect_uri')).toBe('https://example.com/console');
      expect(url.searchParams.get('state')).toBe('sign_out_success');
      expect(url.searchParams.has('client_id')).toBe(false);
    });

    it('sends client_id instead of id_token_hint when sendIdTokenInLogoutRequest is false', async () => {
      const client = await initForSignOut({sendIdTokenInLogoutRequest: false});

      const url = new URL(await (client as any).getSignOutUrl());

      expect(url.searchParams.get('client_id')).toBe('test-client');
      expect(url.searchParams.has('id_token_hint')).toBe(false);
      expect(url.searchParams.get('post_logout_redirect_uri')).toBe('https://example.com/console');
    });

    it('throws when the OP advertises no end_session_endpoint', async () => {
      const client = await initForSignOut(
        {sendIdTokenInLogoutRequest: true},
        {token_endpoint: 'https://example.com/oauth2/token'},
      );

      await expect((client as any).getSignOutUrl()).rejects.toMatchObject({code: 'JS-AUTH_CORE-GSOU-NF01'});
    });

    it('falls back to client_id when no ID token is available', async () => {
      const client = await initForSignOut({sendIdTokenInLogoutRequest: true});

      const url = new URL(await (client as any).getSignOutUrl());

      expect(url.searchParams.get('client_id')).toBe('test-client');
      expect(url.searchParams.has('id_token_hint')).toBe(false);
    });

    it('sends id_token_hint by default (no explicit flag) when an ID token is available', async () => {
      const client = await initForSignOut({});
      await (client as any).storageManager.setSessionData({id_token: 'test-id-token'});

      const url = new URL(await (client as any).getSignOutUrl());

      expect(url.searchParams.get('id_token_hint')).toBe('test-id-token');
      expect(url.searchParams.has('client_id')).toBe(false);
    });
  });
});
