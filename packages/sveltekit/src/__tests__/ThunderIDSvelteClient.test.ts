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

import {describe, it, expect, vi, beforeEach} from 'vitest';

vi.mock('@thunderid/browser', () => {
  const getBrandingPreference = vi.fn().mockResolvedValue(null);
  const updateMeProfile = vi.fn().mockResolvedValue({});

  class MockBrowserClient {
    private _initialized = false;
    private _config: any = null;
    private _storage: any = null;

    async initialize(config: any, storage?: any): Promise<boolean> {
      this._config = config;
      this._storage = storage;
      this._initialized = true;
      return true;
    }

    async reInitialize(_config: any): Promise<boolean> {
      return true;
    }

    getStorageManager(): any {
      return {
        setSessionData: vi.fn().mockResolvedValue(undefined),
        getSessionData: vi.fn().mockResolvedValue(null),
        getConfigData: vi.fn().mockResolvedValue({baseUrl: 'https://example.com', clientId: 'cid'}),
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

    getSignInUrl(_customParams?: any, _userId?: string): Promise<string> {
      return Promise.resolve('https://idp.example.com/authorize');
    }

    exchangeToken(_config: any, _sessionId?: string): Promise<any> {
      return Promise.resolve({accessToken: 'new-at'});
    }

    signOut(_sessionId?: string): Promise<string> {
      return Promise.resolve('/');
    }

    revokeAccessToken(_userId?: string): Promise<Response | boolean> {
      return Promise.resolve(true);
    }

    getInstanceId(): number {
      return 0;
    }

    clearSession(_sessionId?: string): void {
      // no-op
    }
  }

  return {
    ThunderIDBrowserClient: MockBrowserClient,
    getBrandingPreference,
    updateMeProfile,
  } as any;
});

const {default: ThunderIDSvelteClient} = await import('../ThunderIDSvelteClient');

describe('ThunderIDSvelteClient', () => {
  beforeEach(() => {
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

  describe('reset', () => {
    it('should reset initialized state', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      expect(await client.isInitialized()).toBe(true);
      await client.reset();
      expect(await client.isInitialized()).toBe(false);
    });

    it('should allow re-initialization after reset', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      expect(await client.isInitialized()).toBe(true);
      await client.reset();
      expect(await client.isInitialized()).toBe(false);
      const r2 = await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      expect(r2).toBe(true);
      expect(await client.isInitialized()).toBe(true);
    });

    it('should not throw when resetting uninitialized client', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await expect(client.reset()).resolves.toBeUndefined();
    });
  });

  describe('app-native signIn skeleton', () => {
    it('should throw NOT_IMPLEMENTED for app-native payload with _subject', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      const payload = {_subject: 'user', stepType: 'authenticate', authType: 'basic'};
      await expect(client.signIn(payload)).rejects.toThrow('not yet implemented');
    });

    it('should throw NOT_IMPLEMENTED for app-native payload with stepType', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      const payload = {stepType: 'authenticate', authType: 'basic', properties: {}};
      await expect(client.signIn(payload)).rejects.toThrow('not yet implemented');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid config', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      const r1 = await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      expect(r1).toBe(true);
      expect(await client.isInitialized()).toBe(true);
    });

    it('should throw AlreadyInitialized on second call', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await client.initialize({baseUrl: 'https://example.com', clientId: 'cid'});
      await expect(client.initialize({baseUrl: 'https://example.com', clientId: 'cid'})).rejects.toThrow();
    });

    it('should throw InvalidConfiguration when baseUrl is missing', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await expect(client.initialize({} as any)).rejects.toThrow();
    });

    it('should throw InvalidConfiguration when baseUrl uses HTTP', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await expect(client.initialize({baseUrl: 'http://example.com', clientId: 'cid'})).rejects.toThrow();
    });

    it('should throw InvalidConfiguration when clientId is missing', async () => {
      const client = ThunderIDSvelteClient.getInstance();
      await expect(client.initialize({baseUrl: 'https://example.com'} as any)).rejects.toThrow();
    });
  });
});
