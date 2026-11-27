// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DefaultCrypto} from '../DefaultCrypto';
import type {Storage} from '../models/store';
import ThunderIDJavaScriptClient from '../ThunderIDJavaScriptClient';

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

const OIDC_META = {
  authorization_endpoint: 'https://example.com/oauth2/authorize',
  issuer: 'https://example.com',
  revocation_endpoint: 'https://example.com/oauth2/revoke',
  token_endpoint: 'https://example.com/oauth2/token',
};

const ID_TOKEN = `header.${Buffer.from(JSON.stringify({sub: 'user-1', username: 'alice'})).toString('base64url')}.sig`;

const jsonResponse = (body: unknown, ok = true, status = 200): unknown => ({
  json: () => Promise.resolve(body),
  ok,
  status,
  statusText: ok ? 'OK' : 'Bad Request',
  text: () => Promise.resolve(JSON.stringify(body)),
});

const newClient = async (config: Record<string, unknown> = {}, loadMetadata = true): Promise<any> => {
  const client: any = new ThunderIDJavaScriptClient(new MemoryStore(), new DefaultCrypto());

  await client.initialize({
    afterSignInUrl: 'https://app.example.com/callback',
    baseUrl: 'https://example.com',
    clientId: 'test-client',
    ...config,
  });

  if (loadMetadata) {
    await client.storageManager.setOIDCProviderMetaData(OIDC_META);
    await client.storageManager.setTemporaryDataParameter('op_config_initiated', true);
  }

  return client;
};

const stateOf = (url: string): string => new URL(url).searchParams.get('state') ?? '';

describe('ThunderIDJavaScriptClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('authorization state', () => {
    it('generates the authorization state from random bytes on every request', async () => {
      const client = await newClient();

      const first: string = stateOf(await client.getSignInUrl({}, 'session-1'));
      const second: string = stateOf(await client.getSignInUrl({}, 'session-2'));

      expect(first).toMatch(/^instance_0_[A-Za-z0-9]{40,}_request_0$/);
      expect(second).toMatch(/^instance_0_[A-Za-z0-9]{40,}_request_0$/);
      expect(first).not.toBe(second);
      expect(first).not.toBe('instance_0_request_0');
    });

    it('keeps the random part free of the separators the state is parsed by', async () => {
      const client = await newClient();

      for (let i = 0; i < 50; i += 1) {
        const state: string = stateOf(await client.getSignInUrl({}, `session-${i}`));
        const random: string = state.slice('instance_0_'.length, -'_request_0'.length);

        expect(random).toMatch(/^[A-Za-z0-9]+$/);
        expect(random).not.toContain('request_');
        expect(state.split('request_')).toHaveLength(2);
      }
    });

    it('exchanges the code when the callback carries the state the request sent', async () => {
      const client = await newClient();
      const state: string = stateOf(await client.getSignInUrl({}, 'session-1'));
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({access_token: 'at'}));
      vi.stubGlobal('fetch', fetchMock);
      const handleTokenResponse = vi.spyOn(client.authHelper, 'handleTokenResponse').mockResolvedValue({});

      await client.requestAccessToken('code-1', state, 'session-1');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(handleTokenResponse).toHaveBeenCalledTimes(1);
    });

    it('fails without a token request or a stored session when the state does not match', async () => {
      const client = await newClient();
      const state: string = stateOf(await client.getSignInUrl({}, 'session-1'));
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.requestAccessToken('code-1', 'instance_0_request_0', 'session-1')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-RAT1-IV04',
      });
      await expect(client.requestAccessToken('code-1', `${state}x`, 'session-1')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-RAT1-IV04',
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(await client.storageManager.getSessionData('session-1')).toBeNull();
    });

    it('fails when the state was issued for another session', async () => {
      const client = await newClient();
      const state: string = stateOf(await client.getSignInUrl({}, 'session-1'));
      vi.stubGlobal('fetch', vi.fn());

      await expect(client.requestAccessToken('code-1', state, 'session-2')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-RAT1-IV04',
      });
    });

    it('accepts a state only once', async () => {
      const client = await newClient();
      const state: string = stateOf(await client.getSignInUrl({}, 'session-1'));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({access_token: 'at'})));
      vi.spyOn(client.authHelper, 'handleTokenResponse').mockResolvedValue({});

      await client.requestAccessToken('code-1', state, 'session-1');

      await expect(client.requestAccessToken('code-1', state, 'session-1')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-RAT1-IV04',
      });
    });
  });

  describe('error messages', () => {
    it('reads the message of a rejected token request from error and error_description', async () => {
      const client = await newClient();
      const state: string = stateOf(await client.getSignInUrl({}, 'session-1'));
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            jsonResponse({error: 'invalid_grant', error_description: 'The code expired.'}, false, 400),
          ),
      );

      await expect(client.requestAccessToken('code-1', state, 'session-1')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-RAT1-HE03',
        message: 'invalid_grant: The code expired.',
      });
    });

    it('reads the message of a rejected client credentials request', async () => {
      const client = await newClient({clientSecret: 'secret', grantType: 'client_credentials'});
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'unauthorized_client'}, false, 400)));

      await expect(client.getAccessToken()).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-RCCT-HE03',
        message: 'unauthorized_client',
      });
    });

    it('falls back to a fixed message when the revocation response has no error body', async () => {
      const client = await newClient();
      await client.setSession({access_token: 'at'}, 'session-1');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse('not json', false, 400)));

      const error: Error = await client.revokeAccessToken('session-1').catch((e: Error) => e);

      expect(error).toMatchObject({code: 'JS-AUTH_CORE-RAT3-HE03'});
      expect(error.message).toBe('The revocation request was rejected.');
    });
  });

  describe('without a session', () => {
    it('getUser() fails with a documented error', async () => {
      const client = await newClient();

      await expect(client.getUser('missing')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-GU-NF01',
        name: 'ThunderIDRuntimeError',
      });
    });

    it('getDecodedIdToken() fails with a documented error', async () => {
      const client = await newClient();

      await expect(client.getDecodedIdToken('missing')).rejects.toMatchObject({code: 'JS-AUTH_CORE-GDIT-NF01'});
    });

    it('getDecodedIdToken() decodes a given ID token', async () => {
      const client = await newClient();

      await expect(client.getDecodedIdToken('missing', ID_TOKEN)).resolves.toMatchObject({sub: 'user-1'});
    });

    it('getUser() returns the claims of a stored ID token', async () => {
      const client = await newClient();
      await client.setSession({access_token: 'at', id_token: ID_TOKEN}, 'session-1');

      await expect(client.getUser('session-1')).resolves.toMatchObject({username: 'alice'});
    });

    it('exchangeToken() does not need an ID token when the template has no {{username}}', async () => {
      const client = await newClient();
      await client.setSession({access_token: 'at'}, 'session-1');
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({access_token: 'exchanged'}));
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        client.exchangeToken(
          {data: {client_id: '{{clientId}}', subject_token: '{{accessToken}}'}, id: 'x'},
          'session-1',
        ),
      ).resolves.toEqual({access_token: 'exchanged'});
      expect(fetchMock.mock.calls[0][1].body).toBe('client_id=test-client&subject_token=at');
    });
  });

  describe('getConfiguration()', () => {
    it('resolves to the configuration', async () => {
      const client = await newClient();
      const result: unknown = client.getConfiguration();

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toMatchObject({clientId: 'test-client'});
    });
  });

  describe('discovery', () => {
    it('getOpenIDProviderEndpoints() loads the discovery document when no other call has', async () => {
      const client = await newClient({}, false);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(OIDC_META)));

      await expect(client.getOpenIDProviderEndpoints()).resolves.toMatchObject({
        authorizationEndpoint: OIDC_META.authorization_endpoint,
        tokenEndpoint: OIDC_META.token_endpoint,
      });
    });

    it('getDiscoveryResponse() loads the discovery document when no other call has', async () => {
      const client = await newClient({}, false);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(OIDC_META)));

      await expect(client.getDiscoveryResponse()).resolves.toMatchObject({token_endpoint: OIDC_META.token_endpoint});
    });

    it('validates the discovered issuer and stores nothing when it does not match', async () => {
      const client = await newClient({}, false);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({...OIDC_META, issuer: 'https://evil.example'})));

      await expect(client.getDiscoveryResponse()).rejects.toMatchObject({code: 'JS-AUTH_CORE-GOPMD-IV03'});
      expect(await client.storageManager.loadOpenIDProviderConfiguration()).toBeNull();
      expect(await client.storageManager.getTemporaryDataParameter('op_config_initiated')).toBeFalsy();
    });

    it('rejects an issuer that only shares a prefix with the expected one', async () => {
      const client = await newClient({}, false);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({...OIDC_META, issuer: 'https://example.com.attacker.test'})),
      );

      await expect(client.getOpenIDProviderEndpoints()).rejects.toMatchObject({code: 'JS-AUTH_CORE-GOPMD-IV03'});
    });

    it('accepts the issuer of a local server at its base URL', async () => {
      const client = await newClient({baseUrl: 'https://localhost:8090/'}, false);
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            jsonResponse({issuer: 'https://localhost:8090', token_endpoint: 'https://localhost:8090/oauth2/token'}),
          ),
      );

      await expect(client.getDiscoveryResponse()).resolves.toMatchObject({issuer: 'https://localhost:8090'});
    });

    it('ignores a trailing slash on either side of the comparison', async () => {
      const withSlash = await newClient({}, false);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({...OIDC_META, issuer: 'https://example.com/'})));
      await expect(withSlash.getDiscoveryResponse()).resolves.toMatchObject({issuer: 'https://example.com/'});

      const baseWithSlash = await newClient({baseUrl: 'https://example.com/'}, false);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(OIDC_META)));
      await expect(baseWithSlash.getDiscoveryResponse()).resolves.toMatchObject({issuer: 'https://example.com'});
    });

    it('compares the discovered issuer with endpoints.issuer when it is set', async () => {
      const custom = await newClient({endpoints: {issuer: 'https://id.example.com'}}, false);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({...OIDC_META, issuer: 'https://id.example.com'})));
      await expect(custom.getDiscoveryResponse()).resolves.toMatchObject({token_endpoint: OIDC_META.token_endpoint});

      // With the override set, the base URL is no longer accepted as the issuer.
      const strict = await newClient({endpoints: {issuer: 'https://id.example.com'}}, false);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(OIDC_META)));
      await expect(strict.getDiscoveryResponse()).rejects.toMatchObject({code: 'JS-AUTH_CORE-GOPMD-IV03'});
    });

    it('names the setting to change, and nothing from the document, in the mismatch message', async () => {
      const client = await newClient({}, false);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({...OIDC_META, issuer: 'https://other.example'})));

      const error: Error = await client.getDiscoveryResponse().catch((e: Error) => e);

      expect(error.message).toContain('endpoints.issuer');
      expect(error.message).not.toContain('https://other.example');
    });

    it('getDiscoveryResponse() does not fetch the document again once loaded', async () => {
      const client = await newClient();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await client.getDiscoveryResponse();

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('embedded mode configuration', () => {
    it('refuses to initialize without a client ID', async () => {
      const client: any = new ThunderIDJavaScriptClient(new MemoryStore(), new DefaultCrypto());

      await expect(
        client.initialize({applicationId: 'app-1', baseUrl: 'https://example.com', mode: 'embedded'}),
      ).rejects.toMatchObject({code: 'JS-AUTH_CORE-INIT-IV01'});
    });

    it('initializes with an application ID and a client ID', async () => {
      const client: any = new ThunderIDJavaScriptClient(new MemoryStore(), new DefaultCrypto());

      await expect(
        client.initialize({applicationId: 'app-1', baseUrl: 'https://example.com', clientId: 'c1', mode: 'embedded'}),
      ).resolves.toBe(true);
    });

    it('leaves redirect mode without a client ID to the sign-in request', async () => {
      const client: any = new ThunderIDJavaScriptClient(new MemoryStore(), new DefaultCrypto());

      await expect(client.initialize({baseUrl: 'https://example.com'})).resolves.toBe(true);
    });
  });

  describe('exchangeFlowAssertion()', () => {
    const ASSERTION = 'flow.assertion.jwt';

    it('exchanges the assertion for an access token without a scope, and keeps it as the ID token', async () => {
      const client = await newClient();
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({access_token: 'at', expires_in: 900, scope: 'self', token_type: 'Bearer'}));
      vi.stubGlobal('fetch', fetchMock);

      const session = await client.exchangeFlowAssertion(ASSERTION);

      const [url, init] = fetchMock.mock.calls[0];
      const body: URLSearchParams = init.body;
      expect(url).toBe('https://example.com/oauth2/token');
      expect(Object.fromEntries(body)).toEqual({
        client_id: 'test-client',
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: ASSERTION,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      });
      expect(init.headers).not.toHaveProperty('Authorization');
      expect(session).toMatchObject({
        access_token: 'at',
        expires_in: '900',
        id_token: ASSERTION,
        scope: 'self',
        token_type: 'Bearer',
      });
      expect((await client.storageManager.getSessionData())?.access_token).toBeUndefined();
    });

    it('authenticates a confidential client with its secret', async () => {
      const client = await newClient({clientSecret: 'secret'});
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({access_token: 'at', expires_in: 900}));
      vi.stubGlobal('fetch', fetchMock);

      await client.exchangeFlowAssertion(ASSERTION);

      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
        `Basic ${Buffer.from('test-client:secret').toString('base64')}`,
      );
    });

    it('sends the secret in the body for client_secret_post', async () => {
      const client = await newClient({clientSecret: 'secret', tokenRequest: {authMethod: 'client_secret_post'}});
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({access_token: 'at', expires_in: 900}));
      vi.stubGlobal('fetch', fetchMock);

      await client.exchangeFlowAssertion(ASSERTION);

      expect(fetchMock.mock.calls[0][1].body.get('client_secret')).toBe('secret');
      expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    });

    it('reports a request that does not reach the server', async () => {
      const client = await newClient();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      await expect(client.exchangeFlowAssertion(ASSERTION)).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-EFA-NE03',
        message: 'offline',
      });
    });

    it('names the missing grant when the application cannot exchange the assertion', async () => {
      const client = await newClient();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({error: 'unauthorized_client', error_description: 'x'}, false, 400)),
      );

      const error: Error = await client.exchangeFlowAssertion(ASSERTION).catch((e: Error) => e);

      expect(error).toMatchObject({code: 'JS-AUTH_CORE-EFA-UC04'});
      expect(error.message).toContain('urn:ietf:params:oauth:grant-type:token-exchange');
    });

    it('reports any other rejection with the server message', async () => {
      const client = await newClient();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'invalid_grant'}, false, 400)));

      await expect(client.exchangeFlowAssertion(ASSERTION)).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-EFA-HE05',
        message: 'invalid_grant',
      });
    });

    it('reports a server without the grant as a rejection, not as an application setting', async () => {
      const client = await newClient();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'unsupported_grant_type'}, false, 400)));

      await expect(client.exchangeFlowAssertion(ASSERTION)).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-EFA-HE05',
        message: 'unsupported_grant_type',
      });
    });

    it('refuses a response without an access token', async () => {
      const client = await newClient();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({token_type: 'Bearer'})));

      await expect(client.exchangeFlowAssertion(ASSERTION)).rejects.toMatchObject({code: 'JS-AUTH_CORE-EFA-IV06'});
    });

    it('needs a token endpoint', async () => {
      const client = await newClient();
      await client.storageManager.setOIDCProviderMetaData({...OIDC_META, token_endpoint: undefined});
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.exchangeFlowAssertion(ASSERTION)).rejects.toMatchObject({code: 'JS-AUTH_CORE-EFA-NF01'});
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses a successful response that is not JSON', async () => {
      const client = await newClient();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({json: () => Promise.reject(new SyntaxError('x')), ok: true, status: 200}),
      );

      await expect(client.exchangeFlowAssertion(ASSERTION)).rejects.toMatchObject({code: 'JS-AUTH_CORE-EFA-IV06'});
    });

    it('needs the client ID', async () => {
      const client = await newClient({clientId: undefined});
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.exchangeFlowAssertion(ASSERTION)).rejects.toMatchObject({code: 'JS-AUTH_CORE-EFA-IV02'});
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
