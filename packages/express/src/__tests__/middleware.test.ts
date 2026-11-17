// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Storage, logger} from '@thunderid/node';
import express from 'express';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {handleSignIn} from '../middleware/authentication';
import handleFlow from '../middleware/flow';
import protect from '../middleware/protect';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

const fakeResponse = (): express.Response =>
  ({
    cookie: vi.fn(),
    end: vi.fn(),
    redirect: vi.fn(),
    status: vi.fn().mockReturnThis(),
  }) as unknown as express.Response;

const newClient = async (): Promise<ThunderIDExpressClient> => {
  const client: ThunderIDExpressClient = new ThunderIDExpressClient();
  await client.initialize({baseUrl: 'https://auth.example.com', clientId: 'test-client'});

  return client;
};

describe('handleSignIn', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to the authorize URL and does not pass the request on to later routes', async () => {
    const client: ThunderIDExpressClient = await newClient();
    vi.spyOn(client, 'getSignInUrl').mockResolvedValue('https://auth.example.com/oauth2/authorize?state=x');
    const req = {cookies: {}, originalUrl: '/login', query: {}, thunderIDAuth: client} as unknown as express.Request;
    const res: express.Response = fakeResponse();
    const next = vi.fn();

    await handleSignIn()(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('https://auth.example.com/oauth2/authorize?state=x');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('protect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers 401 for a request without a session and logs it below the error level', async () => {
    const client: ThunderIDExpressClient = await newClient();
    const error = vi.spyOn(logger, 'error');
    const debug = vi.spyOn(logger, 'debug');
    const req = {cookies: {}, thunderIDAuth: client} as unknown as express.Request;
    const res: express.Response = fakeResponse();
    const next = vi.fn();

    await protect()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(debug).toHaveBeenCalled();
  });

  it('answers 401 for a session that is not signed in, without an error log', async () => {
    const client: ThunderIDExpressClient = await newClient();
    vi.spyOn(client, 'isSignedIn').mockResolvedValue(false);
    const error = vi.spyOn(logger, 'error');
    const req = {
      cookies: {[client.getSessionCookieName()]: 'session-1'},
      thunderIDAuth: client,
    } as unknown as express.Request;
    const res: express.Response = fakeResponse();

    await protect()(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(error).not.toHaveBeenCalled();
  });

  it('logs an error when thunderID() is not mounted', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const res: express.Response = fakeResponse();

    await protect()({cookies: {}} as unknown as express.Request, res, vi.fn());

    expect(error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next() for a signed-in session', async () => {
    const client: ThunderIDExpressClient = await newClient();
    vi.spyOn(client, 'isSignedIn').mockResolvedValue(true);
    const req = {
      cookies: {[client.getSessionCookieName()]: 'session-1'},
      thunderIDAuth: client,
    } as unknown as express.Request;
    const next = vi.fn();

    await protect()(req, fakeResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('handleFlow', () => {
  const originalFetch: typeof fetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const sharedStorage = (): Storage => {
    const data: Map<string, string> = new Map<string, string>();

    return {
      getData: (key: string): Promise<string> => Promise.resolve(data.get(key) ?? null!),
      removeData: (key: string): Promise<void> => {
        data.delete(key);

        return Promise.resolve();
      },
      setData: (key: string, value: string): Promise<void> => {
        data.set(key, value);

        return Promise.resolve();
      },
    };
  };

  const flowResponse = (): express.Response =>
    ({json: vi.fn(), status: vi.fn().mockReturnThis()}) as unknown as express.Response;

  it('posts a session an earlier step returned, through the store its instances share', async () => {
    const storage: Storage = sharedStorage();
    const config = {baseUrl: 'https://auth.example.com', clientId: 'test-client'};
    const first: ThunderIDExpressClient = new ThunderIDExpressClient();
    const second: ThunderIDExpressClient = new ThunderIDExpressClient();
    await first.initialize(config, storage);
    await second.initialize(config, storage);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            challengeToken: 'challenge-1',
            executionId: 'execution-1',
            flowStatus: 'INCOMPLETE',
            sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({assertion: 'signed-assertion', flowStatus: 'COMPLETE'})))
      .mockResolvedValueOnce(new Response(JSON.stringify({redirect_uri: 'https://app.example.com/login?code=c'})));
    global.fetch = fetchMock;

    await handleFlow()(
      {body: {applicationId: 'app-1', authId: 'auth-1'}, thunderIDAuth: first} as unknown as express.Request,
      flowResponse(),
      vi.fn(),
    );
    await handleFlow()(
      {
        body: {authId: 'auth-1', challengeToken: 'challenge-1', executionId: 'execution-1', inputs: {}},
        thunderIDAuth: second,
      } as unknown as express.Request,
      flowResponse(),
      vi.fn(),
    );

    const [, callback] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(JSON.parse(callback.body as string)).toEqual({
      assertion: 'signed-assertion',
      authId: 'auth-1',
      sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}],
    });
    expect(await first.flowSessionStore.getFlowSessions('auth-1')).toEqual([]);
  });
});
