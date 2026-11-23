// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import BrowserTelemetry, {BrowserTelemetryDependencies} from '../BrowserTelemetry';

interface Sent {
  body: {name: string; attributes: {data: Record<string, string>}}[];
  init: RequestInit;
  url: string;
}

const CLAIMS: Record<string, unknown> = {
  auth_time: 1700000000,
  ouId: '22222222-2222-4222-8222-222222222222',
  sub: '11111111-1111-4111-8111-111111111111',
};

describe('BrowserTelemetry', () => {
  let sent: Sent[];
  let telemetry: BrowserTelemetry | undefined;

  const start = (
    endpoint: string,
    overrides: Partial<BrowserTelemetryDependencies> = {},
    token?: string | false,
  ): BrowserTelemetry => {
    telemetry = new BrowserTelemetry(
      {endpoint, format: 'json', token},
      {
        apiBases: ['https://api.example.com'],
        backend: false,
        getAccessToken: () => Promise.resolve('app-token'),
        getClaims: () => Promise.resolve(CLAIMS),
        ...overrides,
      },
    );
    return telemetry;
  };

  beforeEach(() => {
    sent = [];
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        sent.push({body: JSON.parse(init.body as string) as Sent['body'], init, url});
        return Promise.resolve(new Response(null, {status: 204}));
      }),
    );
  });

  afterEach(async () => {
    await telemetry?.dispose();
    telemetry = undefined;
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it("sends the app's token to an endpoint on the app's origin, and none elsewhere or behind a backend", async () => {
    start('/telemetry').track('a.b');
    await telemetry!.flush();
    expect((sent[0].init.headers as Record<string, string>)['Authorization']).toBe('Bearer app-token');
    expect(sent[0].url).toBe(`${window.location.origin}/telemetry`);
    await telemetry!.dispose();

    start('https://collector.example.com/v1/logs').track('a.b');
    await telemetry!.flush();
    expect((sent[1].init.headers as Record<string, string>)['Authorization']).toBeUndefined();
    expect(sent[1].init.credentials).toBe('omit');
    await telemetry!.dispose();

    start('/telemetry', {backend: true}).track('a.b');
    await telemetry!.flush();
    expect((sent[2].init.headers as Record<string, string>)['Authorization']).toBeUndefined();
    await telemetry!.dispose();

    start('/telemetry', {}, false).track('a.b');
    await telemetry!.flush();
    expect((sent[3].init.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('refuses an endpoint on another origin that does not use HTTPS', () => {
    expect(() => start('http://collector.example.com/v1/logs')).toThrow('HTTPS');
    telemetry = undefined;
  });

  it('sends only a configured token when one is set', async () => {
    start('https://collector.example.com/v1/logs', {}, 'collector-token').track('a.b');
    await telemetry!.flush();
    expect((sent[0].init.headers as Record<string, string>)['Authorization']).toBe('Bearer collector-token');
  });

  it("never sends the app's token when the configured token is empty", async () => {
    start('/telemetry', {}, '').track('a.b');
    await telemetry!.flush();
    expect((sent[0].init.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('reports a link that leaves the app, and not one that stays', async () => {
    start('/telemetry');
    document.body.innerHTML =
      '<a id="out" href="https://docs.example.com/guide?q=secret"><span id="inner">Docs</span></a><a id="in" href="/apps">Apps</a>';
    document.getElementById('in')!.addEventListener('click', (event: Event) => event.preventDefault());
    document.getElementById('out')!.addEventListener('click', (event: Event) => event.preventDefault(), {once: false});
    document.getElementById('inner')!.click();
    document.getElementById('in')!.click();
    await telemetry!.flush();
    expect(sent[0].body.map((event: {name: string}) => event.name)).toEqual(['link.open']);
    expect(sent[0].body[0].attributes.data).toEqual({host: 'docs.example.com', path: '/guide'});
  });

  it('reports a sign-in once per sign-in session, and again after a sign-out', async () => {
    start('/telemetry');
    await telemetry!.signedIn();
    await telemetry!.signedIn();
    telemetry!.auth('sign-out');
    await telemetry!.signedIn();
    await telemetry!.flush();
    expect(sent[0].body.map((event: {name: string}) => event.name)).toEqual([
      'auth.sign-in',
      'auth.sign-out',
      'auth.sign-in',
    ]);
  });

  it('reports a sign-in to each endpoint', async () => {
    const first: BrowserTelemetry = start('/telemetry');
    await first.signedIn();
    await first.flush();
    const second: BrowserTelemetry = start('/other-telemetry');
    await second.signedIn();
    await second.flush();
    await first.dispose();
    expect(sent.map((call: Sent) => [call.url, call.body.map((event: {name: string}) => event.name)])).toEqual([
      [expect.stringContaining('/telemetry'), ['auth.sign-in']],
      [expect.stringContaining('/other-telemetry'), ['auth.sign-in']],
    ]);
  });

  it('drops a sign-in still being read when the user signs out', async () => {
    let release: (claims: Record<string, unknown>) => void = () => undefined;
    const claims = new Promise<Record<string, unknown>>((resolve: (value: Record<string, unknown>) => void) => {
      release = resolve;
    });
    start('/telemetry', {getClaims: () => claims});
    const pending: Promise<void> = telemetry!.signedIn();
    telemetry!.auth('sign-out');
    release(CLAIMS);
    await pending;
    await telemetry!.flush();
    expect(sent.flatMap((call: Sent) => call.body.map((event: {name: string}) => event.name))).toEqual([
      'auth.sign-out',
    ]);
    expect(Object.keys(window.localStorage)).toEqual([]);
  });

  it('keys a sign-in by the configured user claim', async () => {
    telemetry = new BrowserTelemetry(
      {endpoint: '/telemetry', format: 'json', identity: {userClaim: 'uid'}},
      {
        apiBases: [],
        backend: false,
        getAccessToken: () => Promise.resolve('app-token'),
        getClaims: () => Promise.resolve({auth_time: 1, uid: 'user-1'}),
      },
    );
    await telemetry.signedIn();
    await telemetry.signedIn();
    await telemetry.flush();
    expect(sent[0].body.map((event: {name: string}) => event.name)).toEqual(['auth.sign-in']);
    expect(Object.values(window.localStorage)).toContain('user-1:1');
  });

  it('sends what is waiting with keepalive when the page is hidden', async () => {
    start('/telemetry').track('a.b');
    window.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].init.keepalive).toBe(true);
  });
});
