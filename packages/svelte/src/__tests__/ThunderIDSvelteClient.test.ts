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

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {ThunderIDSessionPayload} from '../models/session';

vi.mock('@thunderid/node', () => {
  let storageData: Record<string, any> = {};

  class MockMemoryCacheStore {
    setItem(_key: string, _value: any): void {}
    getItem(_key: string): any {
      return null;
    }
    removeItem(_key: string): void {}
    clear(): void {}
  }

  const getMeOrganizations = vi.fn().mockResolvedValue([]);

  const getBrandingPreference = vi.fn().mockResolvedValue(null);

  return {
    ThunderIDNodeClient: class MockNodeClient {
      private storage: any;
      initialized = false;

      async initialize(_config: any, storage?: any): Promise<boolean> {
        this.storage = storage;
        this.initialized = true;
        return true;
      }

      async reInitialize(_config: any): Promise<boolean> {
        return true;
      }

      getStorageManager(): any {
        return {
          setSessionData: vi.fn().mockResolvedValue(undefined),
          getSessionData: vi.fn().mockResolvedValue(null),
          getConfigData: vi.fn().mockResolvedValue({baseUrl: 'https://example.com'}),
        };
      }

      isSignedIn(_sessionId?: string): Promise<boolean> {
        return Promise.resolve(true);
      }

      getUser(_sessionId?: string): Promise<any> {
        return Promise.resolve({id: 'u1', name: 'Test User'});
      }

      getAccessToken(_sessionId?: string): Promise<string> {
        return Promise.resolve('mock-access-token');
      }

      getDecodedIdToken(_sessionId?: string, _idToken?: string): Promise<any> {
        return Promise.resolve({sub: 'user-001'});
      }

      getUserProfile(_sessionId: string): Promise<any> {
        return Promise.resolve({flattenedProfile: {id: 'u1'}, profile: {id: 'u1'}, schemas: []});
      }

      getCurrentOrganization(_sessionId: string): Promise<any> {
        return Promise.resolve(null);
      }

      getMyOrganizations(_sessionId: string): Promise<any[]> {
        return getMeOrganizations();
      }

      getSignInUrl(_customParams?: any, _userId?: string): Promise<string> {
        return Promise.resolve('https://idp.example.com/authorize');
      }

      exchangeToken(_config: any, _sessionId?: string): Promise<any> {
        return Promise.resolve({accessToken: 'new-at'});
      }

      signOut(_sessionId?: string): Promise<string> {
        return Promise.resolve('/');
      }

      getInstanceId(): number {
        return 0;
      }
    },
    MemoryCacheStore: MockMemoryCacheStore,
    getMeOrganizations,
    getBrandingPreference,
    CookieConfig: {SESSION_COOKIE_NAME: 'thunderid_session', TEMP_SESSION_COOKIE_NAME: 'thunderid_temp_session'},
  };
});

const {default: ThunderIDSvelteClient} = await import('../ThunderIDSvelteClient');

describe('ThunderIDSvelteClient', () => {
  beforeEach(() => {
    // Reset singleton between tests
    (ThunderIDSvelteClient as any).instance = undefined;
  });

  describe('singleton', () => {
    it('should return the same instance on getInstance()', () => {
      const a = ThunderIDSvelteClient.getInstance();
      const b = ThunderIDSvelteClient.getInstance();
      expect(a).toBe(b);
    });

    it('should create new instances via constructor', () => {
      const a = ThunderIDSvelteClient.getInstance();
      const b = new (ThunderIDSvelteClient as any)();
      expect(a).not.toBe(b);
    });
  });

  describe('initialize', () => {
    it('should initialize only once', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      const r1 = await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      const r2 = await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      expect(r1).toBe(true);
      expect(r2).toBe(true);
      expect(client.isInitialized).toBe(true);
    });
  });

  describe('rehydrateSessionFromPayload', () => {
    it('should not throw when session is valid', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});

      const session: ThunderIDSessionPayload = {
        accessToken: 'at-valid',
        accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        scopes: 'openid',
        sessionId: 'sess-001',
        sub: 'user-001',
      } as ThunderIDSessionPayload;

      await expect(client.rehydrateSessionFromPayload(session)).resolves.toBeUndefined();
    });

    it('should silently return when not initialized', async () => {
      const client = ThunderIDSvelteClient.getInstance();

      const session: ThunderIDSessionPayload = {
        accessToken: 'at',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        scopes: 'openid',
        sessionId: 'sess-002',
        sub: 'user-002',
      } as ThunderIDSessionPayload;

      // Clearing any earlier initialized state
      client.isInitialized = false;
      await expect(client.rehydrateSessionFromPayload(session)).resolves.toBeUndefined();
    });

    it('should silently return when session has no sessionId', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});

      const session = {accessToken: 'at'} as ThunderIDSessionPayload;
      await expect(client.rehydrateSessionFromPayload(session)).resolves.toBeUndefined();
    });
  });
});
