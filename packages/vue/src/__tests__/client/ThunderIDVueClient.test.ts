// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {ThunderIDVueConfig} from '../../models/config';
import ThunderIDVueClient from '../../ThunderIDVueClient';

describe('ThunderIDVueClient.getDiscoveryResponse', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('returns null before the client is initialized', async () => {
    expect(await new ThunderIDVueClient(41).getDiscoveryResponse()).toBeNull();
  });

  it('fetches the discovery document when it has not been loaded yet', async () => {
    const baseUrl = 'https://idp.example.com';
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            authorization_endpoint: `${baseUrl}/oauth2/authorize`,
            issuer: baseUrl,
            token_endpoint: `${baseUrl}/oauth2/token`,
          }),
          {headers: {'Content-Type': 'application/json'}, status: 200},
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new ThunderIDVueClient(42);
    await client.initialize({
      afterSignInUrl: window.location.origin,
      baseUrl,
      clientId: 'discovery-test-client',
      storage: 'sessionStorage',
    } as ThunderIDVueConfig);

    const discovery = await client.getDiscoveryResponse();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/.well-known/openid-configuration`);
    expect(discovery?.issuer).toBe(baseUrl);

    await client.getDiscoveryResponse();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('ThunderIDVueClient embedded SSO session handles', () => {
  let client: ThunderIDVueClient;

  const flowResponse = (body: unknown): Response =>
    new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status: 200});

  const keptSessions = (): Promise<unknown> => (client as any).getFlowSessions();

  beforeEach(async () => {
    sessionStorage.clear();
    client = new ThunderIDVueClient(43);
    await client.initialize({
      afterSignInUrl: window.location.origin,
      applicationId: 'app-1',
      baseUrl: 'https://idp.example.com',
      clientId: 'flow-sessions-client',
      storage: 'sessionStorage',
    } as ThunderIDVueConfig);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('keeps the session handle a sign-in step returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        flowResponse({
          executionId: 'e1',
          flowStatus: 'INCOMPLETE',
          sessionData: [{flowIdentifier: 'f1', sessionHandle: 'h1'}],
        }),
      ),
    );

    await client.signIn({applicationId: 'app-1', flowType: 'AUTHENTICATION'} as any);

    expect(await keptSessions()).toEqual([{flowIdentifier: 'f1', sessionHandle: 'h1'}]);
  });

  it('drops the session a flow step ended', async () => {
    await (client as any).storeFlowSessions({sessionData: [{flowIdentifier: 'f1', sessionHandle: 'h1'}]});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(flowResponse({clearedSessions: ['f1'], executionId: 'e1', flowStatus: 'INCOMPLETE'})),
    );

    await client.signIn({executionId: 'e1', inputs: {}} as any);

    expect(await keptSessions()).toEqual([]);
  });

  it('keeps the session handle a sign-up step returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        flowResponse({
          executionId: 'e1',
          flowStatus: 'INCOMPLETE',
          sessionData: [{flowIdentifier: 'f2', sessionHandle: 'h2'}],
        }),
      ),
    );

    await client.signUp({applicationId: 'app-1', flowType: 'REGISTRATION'} as any);

    expect(await keptSessions()).toEqual([{flowIdentifier: 'f2', sessionHandle: 'h2'}]);
  });

  it('leaves the handles of a flow for an authorization request to its callback', async () => {
    window.history.replaceState(null, '', '/?authId=a1');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        flowResponse({
          executionId: 'e1',
          flowStatus: 'INCOMPLETE',
          sessionData: [{flowIdentifier: 'f1', sessionHandle: 'h1'}],
        }),
      ),
    );

    await client.signIn({applicationId: 'app-1', flowType: 'AUTHENTICATION'} as any);

    expect(await keptSessions()).toEqual([]);
  });
});

describe('ThunderIDVueClient authId of an authorization request', () => {
  let client: ThunderIDVueClient;

  const jsonResponse = (body: unknown): Response =>
    new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status: 200});

  const completeThenCallback = (): ReturnType<typeof vi.fn> =>
    vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({assertion: 'assertion-a', executionId: 'execution-a', flowStatus: 'COMPLETE'}),
      )
      .mockResolvedValueOnce(jsonResponse({redirect_uri: 'https://app.example/callback?code=c1'}));

  const postedCallbackBody = (fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> => {
    const call: any[] | undefined = fetchMock.mock.calls.find((args: any[]) =>
      String(args[0]).endsWith('/oauth2/auth/callback'),
    );

    return JSON.parse(call?.[1].body as string) as Record<string, unknown>;
  };

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    client = new ThunderIDVueClient(44);
    await client.initialize({
      afterSignInUrl: window.location.origin,
      applicationId: 'app-1',
      baseUrl: 'https://idp.example.com',
      clientId: 'auth-id-client',
      storage: 'sessionStorage',
    } as ThunderIDVueConfig);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('posts the authId of its own execution after another tab started a sign-in', async () => {
    const storageManager: any = client.getStorageManager();
    await storageManager.setFlowAuthId('execution-a', 'auth-a');
    // Another tab on the same origin starts its own sign-in.
    await storageManager.setFlowAuthId('execution-b', 'auth-b');
    const fetchMock = completeThenCallback();
    vi.stubGlobal('fetch', fetchMock);

    await client.signIn({executionId: 'execution-a', inputs: {password: 'p', username: 'u'}} as any);

    expect(postedCallbackBody(fetchMock)['authId']).toBe('auth-a');
  });

  it('posts the authId stored for the execution of a magic link opened in a new tab', async () => {
    const storageManager: any = client.getStorageManager();
    await storageManager.setFlowAuthId('execution-a', 'auth-a');
    sessionStorage.clear();
    window.history.replaceState(null, '', '/callback?id=execution-a&token=magic-token');
    const fetchMock = completeThenCallback();
    vi.stubGlobal('fetch', fetchMock);

    await client.signIn({executionId: 'execution-a', inputs: {token: 'magic-token'}} as any);

    expect(postedCallbackBody(fetchMock)['authId']).toBe('auth-a');
  });
});
