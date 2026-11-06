// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import ThunderIDReactClient from '../ThunderIDReactClient';

const CONFIG = {applicationId: 'app-1', baseUrl: 'https://localhost:8090', clientId: 'auth-id-client'};

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status: 200});

const completeThenCallback = (): Mock =>
  vi
    .fn()
    .mockResolvedValueOnce(jsonResponse({assertion: 'assertion-a', executionId: 'execution-a', flowStatus: 'COMPLETE'}))
    .mockResolvedValueOnce(jsonResponse({redirect_uri: 'https://app.example/callback?code=c1'}));

const postedCallbackBody = (fetchMock: Mock): Record<string, unknown> => {
  const call: any[] | undefined = fetchMock.mock.calls.find((args: any[]) =>
    String(args[0]).endsWith('/oauth2/auth/callback'),
  );

  return JSON.parse(call?.[1].body as string) as Record<string, unknown>;
};

describe('ThunderIDReactClient authId of an authorization request', () => {
  let client: ThunderIDReactClient;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    client = new ThunderIDReactClient();
    await client.initialize(CONFIG as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('posts the authId of its own execution after another tab started a sign-in', async () => {
    const storageManager: any = (await client.getStorageManager()) as unknown;
    await storageManager.setFlowAuthId('execution-a', 'auth-a');
    // Another tab on the same origin starts its own sign-in.
    await storageManager.setFlowAuthId('execution-b', 'auth-b');
    const fetchMock: Mock = completeThenCallback();
    vi.stubGlobal('fetch', fetchMock);

    await client.signIn({executionId: 'execution-a', inputs: {password: 'p', username: 'u'}} as any);

    expect(postedCallbackBody(fetchMock)['authId']).toBe('auth-a');
  });

  it('posts the authId stored for the execution of a magic link opened in a new tab', async () => {
    const storageManager: any = (await client.getStorageManager()) as unknown;
    await storageManager.setFlowAuthId('execution-a', 'auth-a');
    sessionStorage.clear();
    window.history.replaceState(null, '', '/callback?id=execution-a&token=magic-token');
    const fetchMock: Mock = completeThenCallback();
    vi.stubGlobal('fetch', fetchMock);

    await client.signIn({executionId: 'execution-a', inputs: {token: 'magic-token'}} as any);

    expect(postedCallbackBody(fetchMock)['authId']).toBe('auth-a');
  });

  it('prefers the authId in the URL over a stored one', async () => {
    const storageManager: any = (await client.getStorageManager()) as unknown;
    await storageManager.setFlowAuthId('execution-a', 'auth-stored');
    window.history.replaceState(null, '', '/?authId=auth-url&executionId=execution-a');
    const fetchMock: Mock = completeThenCallback();
    vi.stubGlobal('fetch', fetchMock);

    await client.signIn({executionId: 'execution-a', inputs: {password: 'p', username: 'u'}} as any);

    expect(postedCallbackBody(fetchMock)['authId']).toBe('auth-url');
  });
});
