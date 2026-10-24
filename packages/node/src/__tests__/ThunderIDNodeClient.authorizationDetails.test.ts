// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AuthorizationDetail} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ThunderIDNodeConfig} from '../models/config';
import MemoryCacheStore from '../stores/MemoryCacheStore';
import ThunderIDNodeClient from '../ThunderIDNodeClient';

const BASE_URL = 'https://auth.example.com';
const TOKEN_ENDPOINT = `${BASE_URL}/oauth2/token`;

const AUTHORIZATION_DETAILS: AuthorizationDetail[] = [
  {actions: ['read'], locations: ['https://api.example.com/accounts'], type: 'account'},
];

// A store of its own per test, since the default one is shared by the whole process.
class IsolatedStore extends MemoryCacheStore {
  private data: Map<string, string> = new Map<string, string>();

  public override setData(key: string, value: string): Promise<void> {
    this.data.set(key, value);

    return Promise.resolve();
  }

  public override getData(key: string): Promise<string> {
    return Promise.resolve(this.data.get(key) ?? '{}');
  }

  public override removeData(key: string): Promise<void> {
    this.data.delete(key);

    return Promise.resolve();
  }
}

const encode = (part: Record<string, unknown>): string => Buffer.from(JSON.stringify(part)).toString('base64url');

const ID_TOKEN = `${encode({alg: 'none'})}.${encode({sid: 'server-session-1', sub: 'user-1'})}.`;

const jsonResponse = (body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status: 200});

describe('ThunderIDNodeClient authorization details', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  const newClient = async (config: Partial<ThunderIDNodeConfig> = {}): Promise<ThunderIDNodeClient> => {
    const client = new ThunderIDNodeClient();

    await client.initialize(
      {
        afterSignInUrl: 'https://app.example.com/login',
        baseUrl: BASE_URL,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        discovery: {wellKnown: {enabled: false}},
        tokenValidation: {idToken: {validate: false}},
        ...config,
      } as ThunderIDNodeConfig,
      new IsolatedStore(),
    );

    return client;
  };

  const tokenRequestBody = (): URLSearchParams => {
    const [, init] = fetchMock.mock.calls.find(([url]: [string]) => url === TOKEN_ENDPOINT) as [string, RequestInit];

    return init.body as URLSearchParams;
  };

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the authorization details of the sign-in options on the authorize request', async () => {
    const client = await newClient();
    const authURLCallback = vi.fn();

    await client.signIn(authURLCallback, 'session-1', undefined, undefined, {
      authorizationDetails: AUTHORIZATION_DETAILS,
    });

    expect(authURLCallback).toHaveBeenCalledTimes(1);

    const authorizeUrl = new URL(authURLCallback.mock.calls[0][0] as string);

    expect(authorizeUrl.origin + authorizeUrl.pathname).toBe(`${BASE_URL}/oauth2/authorize`);
    expect(JSON.parse(authorizeUrl.searchParams.get('authorization_details')!)).toEqual(AUTHORIZATION_DETAILS);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the granted authorization details from the token response on sign-in', async () => {
    const client = await newClient();
    const authURLCallback = vi.fn();

    await client.signIn(authURLCallback, 'session-1', undefined, undefined, {
      authorizationDetails: AUTHORIZATION_DETAILS,
    });

    const state = new URL(authURLCallback.mock.calls[0][0] as string).searchParams.get('state')!;

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: 'access-1',
        authorization_details: AUTHORIZATION_DETAILS,
        expires_in: '3600',
        id_token: ID_TOKEN,
        scope: 'openid',
        token_type: 'Bearer',
      }),
    );

    const response = await client.signIn(authURLCallback, 'session-1', 'auth-code', state);

    expect(response.accessToken).toBe('access-1');
    expect(response.authorizationDetails).toEqual(AUTHORIZATION_DETAILS);

    // An already signed-in session answers from the stored tokens, with the same grant.
    const again = await client.signIn(authURLCallback, 'session-1');

    expect(again.authorizationDetails).toEqual(AUTHORIZATION_DETAILS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves the authorization details out when the token response has none', async () => {
    const client = await newClient();
    const authURLCallback = vi.fn();

    await client.signIn(authURLCallback, 'session-1');

    const state = new URL(authURLCallback.mock.calls[0][0] as string).searchParams.get('state')!;

    fetchMock.mockResolvedValueOnce(
      jsonResponse({access_token: 'access-1', expires_in: '3600', id_token: ID_TOKEN, token_type: 'Bearer'}),
    );

    const response = await client.signIn(authURLCallback, 'session-1', 'auth-code', state);

    expect(response.accessToken).toBe('access-1');
    expect(response.authorizationDetails).toBeUndefined();
  });

  it('sends the configured authorization details on a client credentials token request', async () => {
    const client = await newClient({
      authorizationDetails: AUTHORIZATION_DETAILS,
      grantType: 'client_credentials',
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: 'service-token',
        authorization_details: AUTHORIZATION_DETAILS,
        expires_in: '3600',
        token_type: 'Bearer',
      }),
    );

    await expect(client.getAccessToken('service')).resolves.toBe('service-token');

    const body = tokenRequestBody();

    expect(body.get('grant_type')).toBe('client_credentials');
    expect(JSON.parse(body.get('authorization_details')!)).toEqual(AUTHORIZATION_DETAILS);
  });
});
