// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {DefaultCrypto} from '../DefaultCrypto';
import type {Storage} from '../models/store';
import ThunderIDJavaScriptClient from '../ThunderIDJavaScriptClient';

class MemoryStore implements Storage {
  private store = new Map<string, string>();

  getData(key: string): Promise<string> {
    return Promise.resolve(this.store.get(key) ?? null!);
  }

  setData(key: string, value: string): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }

  removeData(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}

const OIDC_META: Record<string, unknown> = {
  authorization_endpoint: 'https://example.com/oauth2/authorize',
  issuer: 'https://example.com',
  token_endpoint: 'https://example.com/oauth2/token',
};

const token = (claims: Record<string, unknown>): string =>
  `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

const jsonResponse = (body: unknown, ok = true, status = 200): unknown => ({
  json: () => Promise.resolve(body),
  ok,
  status,
});

const SESSION_ID_TOKEN: string = token({sub: 'user-1'});

const newClient = async (config: Record<string, unknown> = {}): Promise<any> => {
  const client: any = new ThunderIDJavaScriptClient(new MemoryStore(), new DefaultCrypto());

  await client.initialize({
    afterSignInUrl: 'https://app.example.com/callback',
    baseUrl: 'https://example.com',
    clientId: 'test-client',
    scopes: ['openid', 'profile'],
    ...config,
  });
  await client.storageManager.setOIDCProviderMetaData(OIDC_META);
  await client.storageManager.setTemporaryDataParameter('op_config_initiated', true);
  await client.storageManager.setSessionData({
    access_token: 'old-access',
    id_token: SESSION_ID_TOKEN,
    refresh_token: 'old-refresh',
  });

  return client;
};

describe('ThunderIDJavaScriptClient re-sign-in', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('buildReauthenticationRequest', () => {
    it('asks for the configured scopes with max_age, id_token_hint, PKCE, state and nonce', async () => {
      const client = await newClient();

      const request = await client.buildReauthenticationRequest({maxAge: 300}, 'https://app.example.com/callback');
      const url = new URL(request.url);

      expect(`${url.origin}${url.pathname}`).toBe('https://example.com/oauth2/authorize');
      expect(url.searchParams.get('max_age')).toBe('300');
      expect(url.searchParams.has('prompt')).toBe(false);
      expect(url.searchParams.get('id_token_hint')).toBe(SESSION_ID_TOKEN);
      expect(url.searchParams.get('scope')).toContain('openid');
      expect(url.searchParams.get('scope')).toContain('profile');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('state')).toBe(request.state);
      expect(url.searchParams.get('nonce')).toBe(request.nonce);
      expect(request.nonce).not.toBe(request.state);
      expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/callback');
    });

    it('asks for prompt=login when maxAge is not known', async () => {
      const client = await newClient();

      const url = new URL((await client.buildReauthenticationRequest({}, 'https://app.example.com/callback')).url);

      expect(url.searchParams.get('prompt')).toBe('login');
      expect(url.searchParams.has('max_age')).toBe(false);
    });
  });

  describe('completeReauthentication', () => {
    const complete = async (
      client: any,
      idTokenClaims: Record<string, unknown>,
    ): Promise<{error?: unknown; fetchMock: ReturnType<typeof vi.fn>; request: any}> => {
      const request = await client.buildReauthenticationRequest({maxAge: 300}, 'https://app.example.com/callback');
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          access_token: 'new-access',
          expires_in: 3600,
          id_token: token({nonce: request.nonce, ...idTokenClaims}),
          refresh_token: 'new-refresh',
        }),
      );
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(client.authHelper, 'validateIdToken').mockResolvedValue(true);

      try {
        await client.completeReauthentication(request, 'code-1');
        return {fetchMock, request};
      } catch (error) {
        return {error, fetchMock, request};
      }
    };

    it('redeems the code with its verifier and replaces the session tokens for the same user', async () => {
      const client = await newClient();
      const refreshSpy = vi.spyOn(client, 'refreshAccessToken');

      const {error, fetchMock, request} = await complete(client, {auth_time: 1_800_000_000, sub: 'user-1'});

      expect(error).toBeUndefined();
      const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as URLSearchParams);
      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/oauth2/token');
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('code-1');
      expect(body.get('code_verifier')).toBe(request.codeVerifier);

      const session = await client.storageManager.getSessionData();
      expect(session.access_token).toBe('new-access');
      expect(session.refresh_token).toBe('new-refresh');
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it('keeps the session when the sign-in names another user', async () => {
      const client = await newClient();

      const {error} = await complete(client, {sub: 'someone-else'});

      expect(error).toMatchObject({code: 'JS-AUTH_CORE-CRA-IV03'});
      const session = await client.storageManager.getSessionData();
      expect(session.access_token).toBe('old-access');
      expect(session.id_token).toBe(SESSION_ID_TOKEN);
    });

    it('keeps the session when the ID token does not carry the nonce', async () => {
      const client = await newClient();

      const {error} = await complete(client, {nonce: 'another-nonce', sub: 'user-1'});

      expect(error).toMatchObject({code: 'JS-AUTH_CORE-CRA-IV02'});
      expect((await client.storageManager.getSessionData()).access_token).toBe('old-access');
    });

    it('keeps the session when the ID token is not valid', async () => {
      const client = await newClient();
      const request = await client.buildReauthenticationRequest({maxAge: 300}, 'https://app.example.com/callback');
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            jsonResponse({access_token: 'new-access', id_token: token({nonce: request.nonce, sub: 'user-1'})}),
          ),
      );
      vi.spyOn(client.authHelper, 'validateIdToken').mockResolvedValue(false);

      await expect(client.completeReauthentication(request, 'code-1')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CRA-IV01',
      });
      expect((await client.storageManager.getSessionData()).access_token).toBe('old-access');
    });

    it('keeps the session when the token request is refused', async () => {
      const client = await newClient();
      const request = await client.buildReauthenticationRequest({maxAge: 300}, 'https://app.example.com/callback');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'invalid_grant'}, false, 400)));

      await expect(client.completeReauthentication(request, 'code-1')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-CRA-TE01',
      });
      expect((await client.storageManager.getSessionData()).access_token).toBe('old-access');
    });
  });
});
