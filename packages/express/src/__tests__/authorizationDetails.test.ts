// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AuthorizationDetail, TokenResponse} from '@thunderid/node';
import express from 'express';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {handleSignIn, thunderID} from '../middleware/authentication';
import {ThunderIDExpressConfig} from '../models/config';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

const BASE_URL = 'https://auth.example.com';

const AUTHORIZATION_DETAILS: AuthorizationDetail[] = [
  {actions: ['read'], locations: ['https://api.example.com/accounts'], type: 'account'},
];

const encode = (part: Record<string, unknown>): string => Buffer.from(JSON.stringify(part)).toString('base64url');

const ID_TOKEN = `${encode({alg: 'none'})}.${encode({sid: 'server-session-1', sub: 'user-1'})}.`;

interface MockResponse {
  cookie: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  redirect: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
}

describe('authorization details through the Express middleware', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: ThunderIDExpressClient;

  const newResponse = (): MockResponse => {
    const res: MockResponse = {cookie: vi.fn(), end: vi.fn(), redirect: vi.fn(), status: vi.fn()};

    res.status.mockReturnValue(res);

    return res;
  };

  const newRequest = (query: Record<string, string> = {}, cookies: Record<string, string> = {}): express.Request =>
    ({
      cookies,
      get: () => 'app.example.com',
      originalUrl: '/login',
      protocol: 'https',
      query,
    }) as unknown as express.Request;

  // Mounts `thunderID()` and then `handleSignIn()` for one request, as an Express app would.
  const signIn = async (
    config: Partial<ThunderIDExpressConfig>,
    req: express.Request,
    res: MockResponse,
  ): Promise<void> => {
    const middleware: express.RequestHandler = thunderID({
      afterSignInUrl: 'https://app.example.com/login',
      baseUrl: BASE_URL,
      clientId: 'test-client',
      clientSecret: 'test-secret',
      discovery: {wellKnown: {enabled: false}},
      tokenValidation: {idToken: {validate: false}},
      ...config,
    } as ThunderIDExpressConfig);

    await middleware(req, res as unknown as express.Response, vi.fn());

    client = (req as express.Request & {thunderIDAuth: ThunderIDExpressClient}).thunderIDAuth;

    await handleSignIn()(req, res as unknown as express.Response, vi.fn());
  };

  const redirectedTo = (res: MockResponse): URL => new URL(res.redirect.mock.calls[0][0] as string);

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the authorization details of the sign-in options on the authorize request', async () => {
    const res = newResponse();

    await signIn({signInOptions: {authorizationDetails: AUTHORIZATION_DETAILS}}, newRequest(), res);

    const authorizeUrl = redirectedTo(res);

    expect(authorizeUrl.origin + authorizeUrl.pathname).toBe(`${BASE_URL}/oauth2/authorize`);
    expect(JSON.parse(authorizeUrl.searchParams.get('authorization_details')!)).toEqual(AUTHORIZATION_DETAILS);
  });

  it('sends the configured authorization details on the authorize request', async () => {
    const res = newResponse();

    await signIn({authorizationDetails: AUTHORIZATION_DETAILS}, newRequest(), res);

    expect(JSON.parse(redirectedTo(res).searchParams.get('authorization_details')!)).toEqual(AUTHORIZATION_DETAILS);
  });

  it('hands the granted authorization details to onSignIn', async () => {
    const onSignIn = vi.fn();
    const config: Partial<ThunderIDExpressConfig> = {
      onSignIn,
      signInOptions: {authorizationDetails: AUTHORIZATION_DETAILS},
    };
    const start = newResponse();

    await signIn(config, newRequest(), start);

    const [cookieName, sessionId] = start.cookie.mock.calls[0] as [string, string];
    const state = redirectedTo(start).searchParams.get('state')!;

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'access-1',
          authorization_details: AUTHORIZATION_DETAILS,
          expires_in: '3600',
          id_token: ID_TOKEN,
          scope: 'openid',
          token_type: 'Bearer',
        }),
        {headers: {'Content-Type': 'application/json'}, status: 200},
      ),
    );

    const callback = newResponse();

    await handleSignIn()(
      Object.assign(newRequest({code: 'auth-code', state}, {[cookieName]: sessionId}), {thunderIDAuth: client}),
      callback as unknown as express.Response,
      vi.fn(),
    );

    expect(onSignIn).toHaveBeenCalledTimes(1);

    const tokenResponse = onSignIn.mock.calls[0][1] as TokenResponse;

    expect(tokenResponse.accessToken).toBe('access-1');
    expect(tokenResponse.authorizationDetails).toEqual(AUTHORIZATION_DETAILS);
  });
});
