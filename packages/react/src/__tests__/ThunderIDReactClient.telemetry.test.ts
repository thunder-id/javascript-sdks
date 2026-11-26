// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import {ThunderIDReactConfig} from '../models/config';
import ThunderIDReactClient from '../ThunderIDReactClient';

const CONFIG: ThunderIDReactConfig = {
  applicationId: 'app-1',
  baseUrl: 'https://localhost:8090',
  clientId: 'telemetry-client',
  telemetry: {endpoint: '/telemetry', format: 'json'},
};

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status: 200});

const sentEvents = (fetchMock: Mock): {attributes: {data: Record<string, string>}; name: string}[] =>
  fetchMock.mock.calls
    .filter((args: any[]) => String(args[0]).endsWith('/telemetry'))
    .flatMap(
      (args: any[]) =>
        JSON.parse((args[1] as RequestInit).body as string) as {
          attributes: {data: Record<string, string>};
          name: string;
        }[],
    );

describe('ThunderIDReactClient telemetry', () => {
  let client: ThunderIDReactClient;
  let fetchMock: Mock;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new ThunderIDReactClient();
    await client.initialize(CONFIG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('reports a sign-in that its embedded flow ends with an error, with only a well-formed code', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/telemetry')
          ? new Response(null, {status: 204})
          : json({
              error: {code: 'AUTH-1001', description: {defaultValue: 'x'}, message: {defaultValue: 'Wrong password'}},
              executionId: 'execution-a',
              flowStatus: 'ERROR',
            }),
      ),
    );
    await client.signIn({executionId: 'execution-a', inputs: {password: 'p', username: 'u'}} as any);

    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/telemetry')
          ? new Response(null, {status: 204})
          : json({
              error: {code: 'not a code', description: {defaultValue: 'x'}, message: {defaultValue: 'Bad'}},
              flowStatus: 'ERROR',
            }),
      ),
    );
    await client.signIn({executionId: 'execution-b', inputs: {password: 'p', username: 'u'}} as any);

    window.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() => expect(sentEvents(fetchMock)).toHaveLength(2));
    expect(
      sentEvents(fetchMock).map((event: {attributes: {data: Record<string, string>}; name: string}) => [
        event.name,
        event.attributes.data,
      ]),
    ).toEqual([
      ['auth.sign-in-failed', {error_code: 'AUTH-1001'}],
      ['auth.sign-in-failed', {}],
    ]);
  });
});
