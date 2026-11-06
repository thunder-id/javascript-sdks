// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
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
