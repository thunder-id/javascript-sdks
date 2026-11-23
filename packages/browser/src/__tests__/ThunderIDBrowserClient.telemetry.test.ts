// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */
import {IdToken} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import FetchHttpClient from '../FetchHttpClient';
import ThunderIDBrowserClient from '../ThunderIDBrowserClient';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}, status});

const BFF: string = 'https://app.example.com';

const CONFIG: Record<string, unknown> = {
  baseUrl: BFF,
  clientId: 'my-app',
  endpoints: {backend: {}},
  storage: 'browserMemory',
  telemetry: {endpoint: '/telemetry', format: 'json', prefix: 'acme'},
};

const USER: Record<string, string> = {
  ouId: '22222222-2222-4222-8222-222222222222',
  sub: '11111111-1111-4111-8111-111111111111',
};

interface TelemetryCall {
  body: {attributes: {data: Record<string, string>; user?: {id: string}}; name: string}[];
  init: RequestInit;
}

const telemetryCalls = (fetchMock: Mock): TelemetryCall[] =>
  fetchMock.mock.calls
    .filter(([url]: [string]) => String(url).endsWith('/telemetry'))
    .map(([, init]: [string, RequestInit]) => ({body: JSON.parse(init.body as string) as TelemetryCall['body'], init}));

describe('ThunderIDBrowserClient telemetry', () => {
  let fetchMock: Mock;
  let client: ThunderIDBrowserClient<any>;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        String(url).endsWith('/telemetry')
          ? new Response(null, {status: 204})
          : json(200, {isSignedIn: true, user: USER}),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    client = new ThunderIDBrowserClient<any>(11);
    await client.initialize(CONFIG);
    await client.isSignedIn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    FetchHttpClient.destroyInstance(11);
  });

  it("reports the app's API calls and its own events, attributed, without a token behind a backend", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/telemetry')
          ? new Response(null, {status: 204})
          : String(url).endsWith('/groups')
            ? json(409, {code: 'GRP-1004', message: 'Group "x" exists'})
            : json(201, {id: 'a1'}),
      ),
    );

    await client.httpRequest({data: {name: 'x'}, method: 'POST', url: '/applications'});
    await expect(client.httpRequest({data: {name: 'x'}, method: 'POST', url: '/groups'})).rejects.toBeDefined();
    await client.httpRequest({method: 'GET', url: '/applications'});
    // The SDK's management hooks call the shared HTTP client directly.
    await FetchHttpClient.getInstance(11).request({method: 'DELETE', url: '/roles/r1'});
    client.track('application.template-pick', {type: 'spa'});
    client.trackPageView('/applications/:id');
    window.dispatchEvent(new Event('pagehide'));

    await vi.waitFor(() => expect(telemetryCalls(fetchMock)).toHaveLength(1));
    const [{body, init}] = telemetryCalls(fetchMock);
    expect(body.map((event: {name: string}) => event.name)).toEqual([
      // The backend session was already signed in when the client started.
      'acme.auth.sign-in',
      'acme.application.create',
      'acme.group.create-failed',
      'acme.role.delete',
      'acme.application.template-pick',
      'acme.application.detail-view',
    ]);
    expect(body[2].attributes.data).toEqual({error_code: 'GRP-1004', resource_type: 'group', status: '409'});
    expect(body[1].attributes.user).toEqual({id: USER['sub']});
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('reports a signed-in backend session once across initializations', async () => {
    // Initializing again, as on a later page load, reads the same signed-in session.
    await client.initialize(CONFIG);
    await client.isSignedIn();
    await vi.waitFor(() => {
      window.dispatchEvent(new Event('pagehide'));
      expect(telemetryCalls(fetchMock).length).toBeGreaterThan(0);
    });
    await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 20));
    const names: string[] = telemetryCalls(fetchMock).flatMap((call: TelemetryCall) =>
      call.body.map((event: {name: string}) => event.name),
    );
    expect(names.filter((name: string) => name === 'acme.auth.sign-in')).toHaveLength(1);
  });

  it('bounds how long a sign-out waits for its telemetry', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).endsWith('/telemetry')
        ? new Promise<Response>(() => undefined)
        : Promise.resolve(json(200, {isSignedIn: true, user: USER})),
    );
    const assign: Mock = vi.fn();
    vi.stubGlobal('location', {
      ...window.location,
      assign,
      set href(value: string) {
        assign(value);
      },
    });
    const started: number = Date.now();
    void client.signOut();
    await vi.waitFor(() => expect(assign).toHaveBeenCalled(), {timeout: 3000});
    expect(Date.now() - started).toBeLessThan(2500);
  });

  it('reports a silent sign-in that starts the session once per sign-in session', async () => {
    const silent: ThunderIDBrowserClient<any> = new ThunderIDBrowserClient<any>(13);
    await silent.initialize({...CONFIG, endpoints: undefined, storage: 'sessionStorage'});
    const claims: Record<string, unknown> = {...USER, auth_time: 1700000000};
    vi.spyOn(silent as any, '_signInSilentlyInternal').mockResolvedValue(USER);
    vi.spyOn(silent, 'isSignedIn').mockResolvedValue(true);
    vi.spyOn(silent, 'getDecodedIdToken').mockResolvedValue(claims as IdToken);
    // The other client's sign-in goes out first.
    await vi.waitFor(() => {
      window.dispatchEvent(new Event('pagehide'));
      expect(telemetryCalls(fetchMock)).toHaveLength(1);
    });
    fetchMock.mockClear();

    await silent.signInSilently();
    await silent.signInSilently();
    await vi.waitFor(() => {
      window.dispatchEvent(new Event('pagehide'));
      expect(telemetryCalls(fetchMock).length).toBeGreaterThan(0);
    });
    await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 20));
    const names: string[] = telemetryCalls(fetchMock).flatMap((call: TelemetryCall) =>
      call.body.map((event: {name: string}) => event.name),
    );
    expect(names).toEqual(['acme.auth.sign-in']);
    FetchHttpClient.destroyInstance(13);
  });

  it('reports nothing without an endpoint', async () => {
    // The other client's sign-in goes out first.
    await vi.waitFor(() => {
      window.dispatchEvent(new Event('pagehide'));
      expect(telemetryCalls(fetchMock)).toHaveLength(1);
    });
    fetchMock.mockClear();
    const quiet: ThunderIDBrowserClient<any> = new ThunderIDBrowserClient<any>(12);
    await quiet.initialize({...CONFIG, telemetry: undefined});
    fetchMock.mockImplementation(() => Promise.resolve(json(201, {})));
    await quiet.httpRequest({method: 'POST', url: '/applications'});
    quiet.track('a.b');
    window.dispatchEvent(new Event('pagehide'));
    await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 20));
    expect(telemetryCalls(fetchMock)).toHaveLength(0);
    FetchHttpClient.destroyInstance(12);
  });
});
