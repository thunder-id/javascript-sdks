// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/unbound-method */
import express from 'express';
import {afterEach, describe, expect, it, vi} from 'vitest';
import * as expressIndex from '../index';
import {handleSignIn} from '../middleware/authentication';
import requireAccess from '../middleware/requireAccess';
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

const REQUEST = {
  action: {name: 'booking:read'},
  resource: {type: 'https://api.example.com/booking'},
  subject: {id: 'u1', type: 'user'},
};

describe('sign-in bounded to an organization unit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes ?ouId to the sign-in as the organization unit', async () => {
    const client: ThunderIDExpressClient = await newClient();
    const getSignInUrl = vi.spyOn(client, 'getSignInUrl').mockResolvedValue('https://auth.example.com/ou/x');
    const req = {
      cookies: {},
      originalUrl: '/login?ouId=ou-1',
      query: {ouId: 'ou-1'},
      thunderIDAuth: client,
    } as unknown as express.Request;

    await handleSignIn()(req, fakeResponse(), vi.fn());

    expect(getSignInUrl).toHaveBeenCalledWith(
      expect.objectContaining({organizationUnitId: 'ou-1'}),
      expect.any(String),
    );
  });

  it('starts an ordinary sign-in without ?ouId', async () => {
    const client: ThunderIDExpressClient = await newClient();
    const getSignInUrl = vi.spyOn(client, 'getSignInUrl').mockResolvedValue('https://auth.example.com/x');
    const req = {cookies: {}, originalUrl: '/login', query: {}, thunderIDAuth: client} as unknown as express.Request;

    await handleSignIn()(req, fakeResponse(), vi.fn());

    expect(getSignInUrl.mock.calls[0][0]).toBeUndefined();
  });
});

describe('requireAccess', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets an allowed request through', async () => {
    const client: ThunderIDExpressClient = await newClient();
    const evaluate = vi.spyOn(client, 'evaluateAccess').mockResolvedValue({decision: true});
    const next = vi.fn();

    await requireAccess(() => REQUEST, {secret: 's'})(
      {thunderIDAuth: client} as unknown as express.Request,
      fakeResponse(),
      next,
    );

    expect(evaluate).toHaveBeenCalledWith(REQUEST, {secret: 's'});
    expect(next).toHaveBeenCalled();
  });

  it('answers 403 on a denial, or hands it to onDenied', async () => {
    const client: ThunderIDExpressClient = await newClient();
    vi.spyOn(client, 'evaluateAccess').mockResolvedValue({context: {reason: 'no'}, decision: false});
    const req = {thunderIDAuth: client} as unknown as express.Request;
    const res: express.Response = fakeResponse();
    const next = vi.fn();

    await requireAccess(() => REQUEST)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();

    const onDenied = vi.fn();
    await requireAccess(() => REQUEST, {onDenied})(req, res, next);
    expect(onDenied).toHaveBeenCalledWith(req, res, {context: {reason: 'no'}, decision: false});
  });

  it('never lets the request through when the evaluation fails', async () => {
    const client: ThunderIDExpressClient = await newClient();
    vi.spyOn(client, 'evaluateAccess').mockRejectedValue(new Error('down'));
    const res: express.Response = fakeResponse();
    const next = vi.fn();

    await requireAccess(() => REQUEST)({thunderIDAuth: client} as unknown as express.Request, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it('is exported with the server-only operations', () => {
    expect(expressIndex.requireAccess).toBe(requireAccess);
    expect(typeof expressIndex.evaluateAccess).toBe('function');
  });
});
