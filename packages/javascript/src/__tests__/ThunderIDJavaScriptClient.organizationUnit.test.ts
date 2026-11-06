// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
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

const OIDC_META: Record<string, unknown> = {
  authorization_endpoint: 'https://example.com/oauth2/authorize',
  introspection_endpoint: 'https://example.com/oauth2/introspect',
  issuer: 'https://example.com',
  token_endpoint: 'https://example.com/oauth2/token',
};

const jsonResponse = (body: unknown, ok = true, status = 200): unknown => ({
  json: () => Promise.resolve(body),
  ok,
  status,
  statusText: ok ? 'OK' : 'Bad Request',
  text: () => Promise.resolve(JSON.stringify(body)),
});

const token = (claims: Record<string, unknown>): string =>
  `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

const newClient = async (
  config: Record<string, unknown> = {},
  meta: Record<string, unknown> = OIDC_META,
): Promise<any> => {
  const client: any = new ThunderIDJavaScriptClient(new MemoryStore(), new DefaultCrypto());

  await client.initialize({
    afterSignInUrl: 'https://app.example.com/callback',
    baseUrl: 'https://example.com',
    clientId: 'test-client',
    ...config,
  });
  await client.storageManager.setOIDCProviderMetaData(meta);
  await client.storageManager.setTemporaryDataParameter('op_config_initiated', true);

  return client;
};

const stateOf = (url: string): string => new URL(url).searchParams.get('state') ?? '';

describe('ThunderIDJavaScriptClient organization units and OAuth extensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('sign-in bounded to an organization unit', () => {
    it('authorizes at the unit endpoint with the identifier percent-encoded', async () => {
      const client = await newClient();

      const url = new URL(await client.getSignInUrl({organizationUnitId: 'ou 1/x'}, 'session-1'));

      expect(`${url.origin}${url.pathname}`).toBe('https://example.com/ou/ou%201%2Fx/oauth2/authorize');
      expect(url.searchParams.has('organizationUnitId')).toBe(false);
      expect(url.searchParams.get('client_id')).toBe('test-client');
    });

    it('keeps a discovered path prefix in front of the unit segment', async () => {
      const client = await newClient(
        {},
        {...OIDC_META, authorization_endpoint: 'https://example.com/auth/oauth2/authorize'},
      );

      const url = new URL(await client.getSignInUrl({organizationUnitId: 'ou-1'}, 'session-1'));

      expect(url.pathname).toBe('/auth/ou/ou-1/oauth2/authorize');
    });

    it('leaves the authorize URL unchanged without a unit', async () => {
      const client = await newClient();

      const url = new URL(await client.getSignInUrl({}, 'session-1'));

      expect(url.pathname).toBe('/oauth2/authorize');
    });

    it('redeems the code of a bounded sign-in at the unit token endpoint, once', async () => {
      const client = await newClient();
      const state: string = stateOf(await client.getSignInUrl({organizationUnitId: 'ou-1'}, 'session-1'));
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({access_token: 'at'}));
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(client.authHelper, 'handleTokenResponse').mockResolvedValue({});

      expect(await client.isOrganizationUnitBoundRequest(state, 'session-1')).toBe(true);

      await client.requestAccessToken('code-1', state, 'session-1');

      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/ou/ou-1/oauth2/token');
      expect(await client.isOrganizationUnitBoundRequest(state, 'session-1')).toBe(false);
    });

    it('redeems an unbounded code at the default token endpoint', async () => {
      const client = await newClient();
      const state: string = stateOf(await client.getSignInUrl({}, 'session-1'));
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({access_token: 'at'}));
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(client.authHelper, 'handleTokenResponse').mockResolvedValue({});

      expect(await client.isOrganizationUnitBoundRequest(state, 'session-1')).toBe(false);

      await client.requestAccessToken('code-1', state, 'session-1');

      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/oauth2/token');
    });
  });

  describe('getCurrentOrganizationUnit()', () => {
    const sessionWith = async (claims: Record<string, unknown>): Promise<any> => {
      const client = await newClient();
      const idToken: string = token({exp: Math.floor(Date.now() / 1000) + 3600, sub: 'u1', ...claims});

      await client.storageManager.setSessionData({
        access_token: 'at',
        created_at: Date.now(),
        expires_in: '3600',
        id_token: idToken,
      });

      return client;
    };

    it('reads the unit from the session claims', async () => {
      const client = await sessionWith({ouHandle: 'acme', ouId: 'ou-1', ouName: 'Acme'});

      expect(await client.getCurrentOrganizationUnit()).toEqual({handle: 'acme', id: 'ou-1', name: 'Acme'});
    });

    it('returns null when the claims carry no unit', async () => {
      const client = await sessionWith({});

      expect(await client.getCurrentOrganizationUnit()).toBeNull();
    });

    it('returns null when signed out', async () => {
      const client = await newClient();

      expect(await client.getCurrentOrganizationUnit()).toBeNull();
    });

    it('refuses to switch on the base client', async () => {
      const client = await newClient();

      await expect(client.switchOrganizationUnit('ou-1')).rejects.toMatchObject({code: 'JS-AUTH_CORE-SWOU-NS01'});
    });
  });

  describe('pushed authorization requests', () => {
    it('does not push by default', async () => {
      const client = await newClient();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const url = new URL(await client.getSignInUrl({}, 'session-1'));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(url.searchParams.has('state')).toBe(true);
    });

    it('pushes when the application asks for it and redirects with the request_uri only', async () => {
      const client = await newClient({clientSecret: 'secret', pushedAuthorizationRequests: true});
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({expires_in: 60, request_uri: 'urn:ietf:params:oauth:request_uri:abc'}, true, 201),
        );
      vi.stubGlobal('fetch', fetchMock);

      const url = new URL(await client.getSignInUrl({organizationUnitId: 'ou-1'}, 'session-1'));
      const [endpoint, init] = fetchMock.mock.calls[0];
      const body = init.body as URLSearchParams;

      expect(endpoint).toBe('https://example.com/oauth2/par');
      expect(body.get('response_type')).toBe('code');
      expect(body.get('redirect_uri')).toBe('https://app.example.com/callback');
      expect(body.get('state')).toBeTruthy();
      expect(init.headers.Authorization).toMatch(/^Basic /);
      expect(url.pathname).toBe('/ou/ou-1/oauth2/authorize');
      expect([...url.searchParams.keys()].sort()).toEqual(['client_id', 'request_uri']);
      expect(url.searchParams.get('request_uri')).toBe('urn:ietf:params:oauth:request_uri:abc');
      expect(client.lastAuthorizeRequestState).toBe(body.get('state'));
    });

    it('pushes to the discovered endpoint when the server requires it, even if the app opts out', async () => {
      const client = await newClient(
        {pushedAuthorizationRequests: false},
        {
          ...OIDC_META,
          pushed_authorization_request_endpoint: 'https://example.com/custom/par',
          require_pushed_authorization_requests: true,
        },
      );
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({request_uri: 'urn:x'}, true, 201));
      vi.stubGlobal('fetch', fetchMock);

      const url = new URL(await client.getSignInUrl({}, 'session-1'));

      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/custom/par');
      expect(url.searchParams.get('request_uri')).toBe('urn:x');
    });

    it('fails with the server error when the push is rejected', async () => {
      const client = await newClient({pushedAuthorizationRequests: true});
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({error: 'invalid_request', error_description: 'bad'}, false, 400)),
      );

      await expect(client.getSignInUrl({}, 'session-1')).rejects.toMatchObject({code: 'JS-AUTH_CORE-PAR-HE03'});
    });

    it('fails when the push response has no request_uri', async () => {
      const client = await newClient({pushedAuthorizationRequests: true});
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, true, 201)));

      await expect(client.getSignInUrl({}, 'session-1')).rejects.toMatchObject({code: 'JS-AUTH_CORE-PAR-PR04'});
    });
  });

  describe('device authorization', () => {
    it('starts at {baseUrl}/oauth2/device-authorize and maps the response', async () => {
      const client = await newClient({scopes: ['openid', 'profile']});
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          device_code: 'device-secret',
          expires_in: 600,
          interval: 5,
          user_code: 'BCDF-GHJK',
          verification_uri: 'https://example.com/gate/device',
          verification_uri_complete: 'https://example.com/gate/device?user_code=BCDF-GHJK',
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = await client.startDeviceAuthorization({resource: 'https://api.example.com'});
      const body = fetchMock.mock.calls[0][1].body as URLSearchParams;

      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/oauth2/device-authorize');
      expect(body.get('client_id')).toBe('test-client');
      expect(body.get('scope')).toBe('openid profile');
      expect(body.get('resource')).toBe('https://api.example.com');
      expect(response).toEqual({
        deviceCode: 'device-secret',
        expiresIn: 600,
        interval: 5,
        userCode: 'BCDF-GHJK',
        verificationUri: 'https://example.com/gate/device',
        verificationUriComplete: 'https://example.com/gate/device?user_code=BCDF-GHJK',
      });
    });

    it('uses the discovered device authorization endpoint', async () => {
      const client = await newClient({}, {...OIDC_META, device_authorization_endpoint: 'https://example.com/d'});
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({device_code: 'd', user_code: 'u', verification_uri: 'https://example.com/v'}));
      vi.stubGlobal('fetch', fetchMock);

      await client.startDeviceAuthorization();

      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/d');
    });

    it('fails with the OAuth error when the request is rejected', async () => {
      const client = await newClient();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'unauthorized_client'}, false, 400)));

      await expect(client.startDeviceAuthorization()).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-DEVICE1-HE03',
        statusCode: 400,
      });
    });

    it('polls through authorization_pending and slow_down, then stores the tokens', async () => {
      const client = await newClient();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({error: 'authorization_pending'}, false, 400))
        .mockResolvedValueOnce(jsonResponse({error: 'slow_down'}, false, 400))
        .mockResolvedValueOnce(jsonResponse({access_token: 'at'}));
      vi.stubGlobal('fetch', fetchMock);
      vi.useFakeTimers();
      const handleTokenResponse = vi
        .spyOn(client.authHelper, 'handleTokenResponse')
        .mockResolvedValue({accessToken: 'at'});

      const polling = client.pollDeviceAuthorization('device-secret', 0, undefined, 'session-1');
      await vi.runAllTimersAsync();

      await expect(polling).resolves.toEqual({accessToken: 'at'});
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:device_code');
      expect(body.get('device_code')).toBe('device-secret');
      expect(handleTokenResponse).toHaveBeenCalledWith(expect.anything(), 'session-1');
    });

    it('stops with the server error on access_denied', async () => {
      const client = await newClient();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'access_denied'}, false, 400)));

      await expect(client.pollDeviceAuthorization('d', 0)).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-DEVICE2-HE03',
        serverError: {code: 'access_denied'},
      });
    });

    it('stops when cancelled', async () => {
      const client = await newClient();
      const controller = new AbortController();
      controller.abort();

      await expect(client.pollDeviceAuthorization('d', 0, {signal: controller.signal})).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-DEVICE2-AB05',
      });
    });
  });

  describe('introspectToken()', () => {
    it('posts the token with client authentication and returns the response', async () => {
      const client = await newClient({clientSecret: 'secret'});
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({active: true, sub: 'u1'}));
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.introspectToken('tok', 'access_token');
      const [endpoint, init] = fetchMock.mock.calls[0];

      expect(endpoint).toBe('https://example.com/oauth2/introspect');
      expect((init.body as URLSearchParams).get('token')).toBe('tok');
      expect((init.body as URLSearchParams).get('token_type_hint')).toBe('access_token');
      expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('test-client:secret').toString('base64')}`);
      expect(result).toEqual({active: true, sub: 'u1'});
    });

    it('returns an inactive token as a result', async () => {
      const client = await newClient({clientSecret: 'secret'});
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({active: false})));

      expect(await client.introspectToken('tok')).toEqual({active: false});
    });

    it('keeps a distinct code for 401 and carries the OAuth error', async () => {
      const client = await newClient({clientSecret: 'secret'});
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'invalid_client'}, false, 401)));

      await expect(client.introspectToken('tok')).rejects.toMatchObject({
        code: 'introspectToken-UnauthorizedError-001',
        serverError: {code: 'invalid_client'},
        statusCode: 401,
      });
    });

    it('refuses an empty token', async () => {
      const client = await newClient();

      await expect(client.introspectToken('')).rejects.toMatchObject({code: 'introspectToken-ValidationError-002'});
    });
  });
  describe('switching with the device secret', () => {
    const DEVICE_SECRET = 'device-secret-jwt';
    const TOKEN_EXCHANGE = 'urn:ietf:params:oauth:grant-type:token-exchange';

    const signedIn = async (config: Record<string, unknown> = {}): Promise<any> => {
      const client = await newClient({scopes: ['openid', 'device_sso'], ...config});
      await client.storageManager.setSessionData({
        access_token: 'old-at',
        created_at: 1,
        device_secret: DEVICE_SECRET,
        expires_in: '3600',
        flow_sessions: [{flowIdentifier: 'f1', sessionHandle: 'h1'}],
        id_token: 'old-id',
        refresh_token: 'old-rt',
        scope: 'openid',
        token_type: 'Bearer',
      });
      vi.spyOn(client.authHelper, 'validateIdToken').mockResolvedValue(true);

      return client;
    };

    it('exchanges the device secret at the unit token endpoint', async () => {
      const client = await signedIn();
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({access_token: 'new-at', id_token: 'new-id'}));
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.switchOrganizationUnitWithDeviceSecret('ou 1/x');

      expect(result).toMatchObject({tokenResponse: {accessToken: 'new-at', idToken: 'new-id'}});
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://example.com/ou/ou%201%2Fx/oauth2/token');
      expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
        client_id: 'test-client',
        grant_type: TOKEN_EXCHANGE,
        scope: 'openid device_sso',
        subject_token: DEVICE_SECRET,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      });
      expect(init.headers.Authorization).toBeUndefined();
    });

    it('authenticates a confidential client with its secret', async () => {
      const client = await signedIn({clientSecret: 'secret'});
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({access_token: 'new-at'}));
      vi.stubGlobal('fetch', fetchMock);

      await client.switchOrganizationUnitWithDeviceSecret('ou-1');

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('test-client:secret').toString('base64')}`);
      expect((init.body as URLSearchParams).has('client_secret')).toBe(false);
    });

    it('replaces every token of the session and keeps its SSO credentials', async () => {
      const client = await signedIn();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({access_token: 'new-at', id_token: 'new-id'})));

      await client.switchOrganizationUnitWithDeviceSecret('ou-1');

      const session = await client.storageManager.getSessionData();
      expect(session).toMatchObject({
        access_token: 'new-at',
        device_secret: DEVICE_SECRET,
        flow_sessions: [{flowIdentifier: 'f1', sessionHandle: 'h1'}],
        id_token: 'new-id',
      });
      expect(session.refresh_token).toBeUndefined();
    });

    it('keeps the session when the new ID token fails validation', async () => {
      const client = await signedIn();
      client.authHelper.validateIdToken.mockRejectedValue(new Error('bad signature'));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({access_token: 'new-at', id_token: 'new-id'})));

      await expect(client.switchOrganizationUnitWithDeviceSecret('ou-1')).rejects.toThrow('bad signature');
      expect(await client.storageManager.getSessionData()).toMatchObject({
        access_token: 'old-at',
        refresh_token: 'old-rt',
      });
    });

    it('reports a request that does not reach the server', async () => {
      const client = await signedIn();
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

      await expect(client.switchOrganizationUnitWithDeviceSecret('ou-1')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-SOUDS-NE02',
      });
    });

    it('refuses when discovery names no token endpoint', async () => {
      const client = await newClient({}, {authorization_endpoint: 'https://example.com/oauth2/authorize'});
      await client.storageManager.setSessionData({access_token: 'old-at', device_secret: DEVICE_SECRET});

      await expect(client.switchOrganizationUnitWithDeviceSecret('ou-1')).rejects.toMatchObject({
        code: 'JS-AUTH_CORE-SOUDS-NF01',
      });
    });

    it('sends nothing when the session holds no device secret', async () => {
      const client = await newClient();
      await client.storageManager.setSessionData({access_token: 'old-at'});
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      expect(await client.switchOrganizationUnitWithDeviceSecret('ou-1')).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns the OAuth error and leaves the session as it was', async () => {
      const client = await signedIn();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'interaction_required'}, false, 400)));

      expect(await client.switchOrganizationUnitWithDeviceSecret('ou-1')).toEqual({error: 'interaction_required'});
      expect(await client.storageManager.getSessionData()).toMatchObject({
        access_token: 'old-at',
        device_secret: DEVICE_SECRET,
        refresh_token: 'old-rt',
      });
    });

    it.each(['invalid_request', 'invalid_grant'])('drops a device secret the server refuses with %s', async (error) => {
      const client = await signedIn();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error}, false, 400)));

      expect(await client.switchOrganizationUnitWithDeviceSecret('ou-1')).toEqual({error});
      const session = await client.storageManager.getSessionData();
      expect(session.device_secret).toBeUndefined();
      expect(session.access_token).toBe('old-at');
    });

    it('reports a response without an OAuth error as a server error', async () => {
      const client = await signedIn();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse('busy', false, 503)));

      expect(await client.switchOrganizationUnitWithDeviceSecret('ou-1')).toEqual({error: 'server_error'});
    });
  });

  describe('SSO session handles from flow steps', () => {
    it('keeps the handles a step returned and drops the ones it ended', async () => {
      const client = await newClient();

      await client.storeFlowSessions({
        sessionData: [
          {expiresIn: 600, flowIdentifier: 'f1', sessionHandle: 'h1'},
          {flowIdentifier: 'f2', sessionHandle: 'h2'},
        ],
      });
      await client.storeFlowSessions({
        clearedSessions: ['f2'],
        sessionData: [{expiresIn: 600, flowIdentifier: 'f1', sessionHandle: 'h1b'}],
      });

      expect(await client.getFlowSessions()).toEqual([{flowIdentifier: 'f1', sessionHandle: 'h1b'}]);
    });

    it('leaves out a handle past its expiry', async () => {
      vi.useFakeTimers();
      const client = await newClient();
      await client.storeFlowSessions({sessionData: [{expiresIn: 1, flowIdentifier: 'f1', sessionHandle: 'h1'}]});

      vi.advanceTimersByTime(2000);

      expect(await client.getFlowSessions()).toEqual([]);
    });

    it('keeps the tokens of the session it stores the handles in', async () => {
      const client = await newClient();
      await client.storageManager.setSessionData({access_token: 'at'});

      await client.storeFlowSessions({sessionData: [{flowIdentifier: 'f1', sessionHandle: 'h1'}]});
      await client.storeFlowSessions({});

      expect(await client.storageManager.getSessionData()).toMatchObject({
        access_token: 'at',
        flow_sessions: [{flowIdentifier: 'f1', sessionHandle: 'h1'}],
      });
    });
  });
});
