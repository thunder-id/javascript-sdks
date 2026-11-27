// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import {afterEach, beforeEach, describe, expect, it, type Mock, vi} from 'vitest';
import ThunderIDReactClient from '../ThunderIDReactClient';

const CONFIG = {applicationId: 'app-1', baseUrl: 'https://localhost:8090', clientId: 'flow-sessions-client'};

const flowResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status: 200});

const keptSessions = (client: ThunderIDReactClient): Promise<unknown> => (client as any).getFlowSessions();

describe('ThunderIDReactClient embedded SSO session handles', () => {
  let client: ThunderIDReactClient;

  beforeEach(async () => {
    sessionStorage.clear();
    client = new ThunderIDReactClient();
    await client.initialize(CONFIG as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(await keptSessions(client)).toEqual([{flowIdentifier: 'f1', sessionHandle: 'h1'}]);
  });

  it('drops the session a flow step ended', async () => {
    await (client as any).storeFlowSessions({sessionData: [{flowIdentifier: 'f1', sessionHandle: 'h1'}]});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(flowResponse({clearedSessions: ['f1'], executionId: 'e1', flowStatus: 'INCOMPLETE'})),
    );

    await client.signIn({executionId: 'e1', inputs: {}} as any);

    expect(await keptSessions(client)).toEqual([]);
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

    expect(await keptSessions(client)).toEqual([{flowIdentifier: 'f2', sessionHandle: 'h2'}]);
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

    expect(await keptSessions(client)).toEqual([]);
  });
});

describe('ThunderIDReactClient embedded session', () => {
  const encode = (claims: Record<string, unknown>): string =>
    `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;
  const assertion: string = encode({
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
    sub: 'u1',
  });

  /** Answers discovery, the flow step and the token request. */
  const serverAnswering = (flowBody: unknown, tokenBody: unknown, tokenStatus = 200): Mock =>
    vi.fn((url: string) => {
      if (url.includes('/.well-known/')) {
        return Promise.resolve(
          flowResponse({issuer: 'https://localhost:8090', token_endpoint: 'https://localhost:8090/oauth2/token'}),
        );
      }

      if (url.endsWith('/oauth2/token')) {
        return Promise.resolve(
          new Response(JSON.stringify(tokenBody), {headers: {'Content-Type': 'application/json'}, status: tokenStatus}),
        );
      }

      return Promise.resolve(flowResponse(flowBody));
    });

  let client: ThunderIDReactClient;

  beforeEach(async () => {
    sessionStorage.clear();
    client = new ThunderIDReactClient();
    await client.initialize(CONFIG as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it.each([
    ['sign-in', (c: ThunderIDReactClient): Promise<unknown> => c.signIn({executionId: 'e1', inputs: {}} as any)],
    ['sign-up', (c: ThunderIDReactClient): Promise<unknown> => c.signUp({executionId: 'e1', inputs: {}} as any)],
  ])('keeps the access token a completed %s exchanges its assertion for', async (_name: string, run: any) => {
    const fetchMock = serverAnswering({assertion, flowStatus: 'COMPLETE'}, {access_token: 'at', expires_in: 900});
    vi.stubGlobal('fetch', fetchMock);
    // The test browser has no Buffer for the default JWT decoder.
    vi.spyOn(client, 'decodeJwtToken').mockResolvedValue({sub: 'u1'} as any);

    await run(client);

    const tokenCall: any[] = fetchMock.mock.calls.find(([url]: any[]) => String(url).endsWith('/oauth2/token'))!;
    expect(tokenCall[1].body.get('subject_token')).toBe(assertion);
    expect(await client.getAccessToken()).toBe('at');
    expect((await client.getStorageManager().getSessionData()).id_token).toBe(assertion);
  });

  it('fails a completed sign-in and keeps no session when the application lacks the grant', async () => {
    vi.stubGlobal(
      'fetch',
      serverAnswering(
        {assertion, flowStatus: 'COMPLETE', sessionData: [{flowIdentifier: 'f1', sessionHandle: 'h1'}]},
        {error: 'unauthorized_client'},
        400,
      ),
    );
    const notifySignInFailed = vi.spyOn(client as any, 'notifySignInFailed');

    await expect(client.signIn({executionId: 'e1', inputs: {}} as any)).rejects.toMatchObject({
      code: 'JS-AUTH_CORE-EFA-UC04',
    });
    expect((await client.getStorageManager().getSessionData())?.access_token).toBeUndefined();
    // A retry shows the flow again instead of completing at once with the same handle.
    expect(await keptSessions(client)).toEqual([]);
    expect(notifySignInFailed).toHaveBeenCalledWith('JS-AUTH_CORE-EFA-UC04');
  });
});
