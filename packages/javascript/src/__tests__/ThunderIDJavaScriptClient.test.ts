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

import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import type {Storage} from '../models/store';
import ThunderIDJavaScriptClient from '../ThunderIDJavaScriptClient';

vi.mock('../IsomorphicCrypto', () => ({
  IsomorphicCrypto: class MockIsomorphicCrypto {
    constructor(_cryptoUtils: unknown) {}
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
});
