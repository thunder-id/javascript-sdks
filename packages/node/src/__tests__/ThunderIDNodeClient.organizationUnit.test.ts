// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import {OrganizationUnitSwitchErrorCodes} from '@thunderid/javascript';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ThunderIDNodeClient from '../ThunderIDNodeClient';

const jsonResponse = (body: unknown, ok = true, status = 200): unknown => ({
  json: () => Promise.resolve(body),
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  text: () => Promise.resolve(JSON.stringify(body)),
});

const newClient = async (config: Record<string, unknown> = {}): Promise<ThunderIDNodeClient> => {
  const client = new ThunderIDNodeClient();
  await client.initialize({
    afterSignInUrl: 'https://app.example.com/callback',
    baseUrl: 'https://example.com',
    clientId: 'test-client',
    clientSecret: 'secret',
    tokenValidation: {idToken: {validate: false}},
    ...config,
  } as any);
  const sm: any = (client as any).getStorageManager();
  await sm.setOIDCProviderMetaData({
    authorization_endpoint: 'https://example.com/oauth2/authorize',
    introspection_endpoint: 'https://example.com/oauth2/introspect',
    issuer: 'https://example.com',
    token_endpoint: 'https://example.com/oauth2/token',
  });
  await sm.setTemporaryDataParameter('op_config_initiated', true);

  return client;
};

const signedIn = async (client: ThunderIDNodeClient, sessionId: string): Promise<void> => {
  await (client as any)
    .getStorageManager()
    .setSessionData(
      {access_token: 'old-at', created_at: Date.now(), expires_in: '3600', id_token: 'h.e30.s'},
      sessionId,
    );
};

describe('ThunderIDNodeClient organization units, device authorization and introspection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('switchOrganizationUnit()', () => {
    it('hands the unit authorization URL to the callback', async () => {
      const client = await newClient();
      const authURLCallback = vi.fn();

      await client.switchOrganizationUnit('ou 1', {authURLCallback, userId: 'session-1'});

      const url = new URL(authURLCallback.mock.calls[0][0]);
      expect(url.pathname).toBe('/ou/ou%201/oauth2/authorize');
      expect(url.searchParams.get('client_id')).toBe('test-client');
    });

    it('refuses without a unit, a session or a callback', async () => {
      const client = await newClient();

      await expect(client.switchOrganizationUnit('', {authURLCallback: vi.fn(), userId: 's'})).rejects.toMatchObject({
        code: OrganizationUnitSwitchErrorCodes.InvalidOrganizationUnit,
      });
      await expect(client.switchOrganizationUnit('ou-1', {authURLCallback: vi.fn()})).rejects.toMatchObject({
        code: OrganizationUnitSwitchErrorCodes.InvalidOrganizationUnit,
      });
      await expect(client.switchOrganizationUnit('ou-1', {userId: 's'})).rejects.toMatchObject({
        code: OrganizationUnitSwitchErrorCodes.InvalidOrganizationUnit,
      });
    });

    it('redeems the callback of a switch at the unit token endpoint while the session is signed in', async () => {
      const client = await newClient();
      await signedIn(client, 'session-1');
      const authURLCallback = vi.fn();
      await client.switchOrganizationUnit('ou-1', {authURLCallback, userId: 'session-1'});
      const state: string = new URL(authURLCallback.mock.calls[0][0]).searchParams.get('state') ?? '';
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({access_token: 'new-at', expires_in: 3600, id_token: 'h.e30.s'}));
      vi.stubGlobal('fetch', fetchMock);

      const tokens = await client.signIn(vi.fn(), 'session-1', 'code-1', state);

      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/ou/ou-1/oauth2/token');
      expect(tokens.accessToken).toBe('new-at');
    });

    it('answers an ordinary callback with the existing session', async () => {
      const client = await newClient();
      await signedIn(client, 'session-1');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const tokens = await client.signIn(vi.fn(), 'session-1', 'code-1', 'instance_0_x_request_0');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(tokens.accessToken).toBe('old-at');
    });

    it('keeps the session when the switch code is rejected', async () => {
      const client = await newClient();
      await signedIn(client, 'session-1');
      const authURLCallback = vi.fn();
      await client.switchOrganizationUnit('ou-1', {authURLCallback, userId: 'session-1'});
      const state: string = new URL(authURLCallback.mock.calls[0][0]).searchParams.get('state') ?? '';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({error: 'invalid_grant'}, false, 400)));

      await expect(client.signIn(vi.fn(), 'session-1', 'code-1', state)).rejects.toBeDefined();

      expect(await client.getAccessToken('session-1')).toBe('old-at');
    });
  });

  describe('device authorization', () => {
    it('starts and polls, storing the tokens for the session', async () => {
      const client = await newClient();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            device_code: 'dc',
            expires_in: 600,
            interval: 0,
            user_code: 'UC',
            verification_uri: 'https://v',
          }),
        )
        .mockResolvedValueOnce(jsonResponse({access_token: 'device-at', expires_in: 3600, id_token: 'h.e30.s'}));
      vi.stubGlobal('fetch', fetchMock);

      const started = await client.startDeviceAuthorization();
      const tokens = await client.pollDeviceAuthorization(started.deviceCode, started.interval, undefined, 'device-1');

      expect(started.userCode).toBe('UC');
      expect(tokens.accessToken).toBe('device-at');
      expect(await client.getAccessToken('device-1')).toBe('device-at');
    });
  });

  describe('introspectToken()', () => {
    it('introspects with client authentication', async () => {
      const client = await newClient();
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({active: true, scope: 'openid'}));
      vi.stubGlobal('fetch', fetchMock);

      expect(await client.introspectToken('tok')).toEqual({active: true, scope: 'openid'});
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toMatch(/^Basic /);
    });
  });

  describe('access evaluation', () => {
    const META = {
      access_evaluation_endpoint: 'https://example.com/access/v1/evaluation',
      access_evaluations_endpoint: 'https://example.com/access/v1/evaluations',
      policy_decision_point: 'https://example.com',
      search_action_endpoint: 'https://example.com/access/v1/search/action',
    };
    const REQUEST = {
      action: {name: 'booking:read'},
      resource: {type: 'https://api.example.com/booking'},
      subject: {id: 'u1', type: 'user'},
    };

    it('uses the configured secret, or one passed per call', async () => {
      const client = await newClient({accessEvaluation: {secret: 'configured'}});
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(META))
        .mockResolvedValueOnce(jsonResponse({decision: true}))
        .mockResolvedValueOnce(jsonResponse(META))
        .mockResolvedValueOnce(jsonResponse({evaluations: [{decision: false}]}))
        .mockResolvedValueOnce(jsonResponse(META))
        .mockResolvedValueOnce(jsonResponse({results: [{name: 'booking:read'}]}));
      vi.stubGlobal('fetch', fetchMock);

      expect(await client.evaluateAccess(REQUEST)).toEqual({decision: true});
      expect(fetchMock.mock.calls[1][1].headers['Direct-Auth-Secret']).toBe('configured');

      expect(await client.evaluateAccesses({evaluations: [REQUEST]}, {secret: 'per-call'})).toEqual([
        {decision: false},
      ]);
      expect(fetchMock.mock.calls[3][1].headers['Direct-Auth-Secret']).toBe('per-call');

      expect(await client.searchActions({resource: REQUEST.resource, subject: REQUEST.subject})).toEqual([
        {name: 'booking:read'},
      ]);
    });
  });
});
