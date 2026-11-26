// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {TelemetryConfig, TelemetryEvent} from '../../models/telemetry';
import Telemetry from '../Telemetry';

const USER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';

const build = (config: Omit<TelemetryConfig, 'endpoint'>): {sent: TelemetryEvent[][]; telemetry: Telemetry} => {
  const sent: TelemetryEvent[][] = [];
  const telemetry: Telemetry = new Telemetry(
    {endpoint: '/telemetry', format: 'json', ...config},
    {
      apiBases: ['https://api.example.com'],
      identity: {getIdentity: () => Promise.resolve({organizationId: ORG, userId: USER})},
      origin: 'https://app.example.com',
      transport: {
        send: (body: string) => {
          sent.push(JSON.parse(body) as TelemetryEvent[]);
          return Promise.resolve();
        },
      },
      userAgent: 'agent',
    },
  );
  return {sent, telemetry};
};

describe('Telemetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is on only with an endpoint', () => {
    expect(Telemetry.isEnabled(undefined)).toBe(false);
    expect(Telemetry.isEnabled({endpoint: ' '})).toBe(false);
    expect(Telemetry.isEnabled({endpoint: '/telemetry'})).toBe(true);
  });

  it('reports every kind with the prefix, the ids and the context, batched', async () => {
    const {sent, telemetry} = build({context: {platform: 'Acme'}, prefix: 'acme'});
    telemetry.page('/applications');
    telemetry.api('POST', 'https://api.example.com/applications', {}, {ok: true});
    telemetry.api(
      'POST',
      'https://api.example.com/groups',
      {},
      {ok: false, responseBody: {code: 'GRP-1004'}, status: 409},
    );
    telemetry.auth('sign-in');
    telemetry.link('https://docs.example.com/guides/start?ref=x#top');
    telemetry.track('application.template-pick', {type: 'spa'});
    await vi.advanceTimersByTimeAsync(5000);

    expect(sent).toHaveLength(1);
    expect(sent[0].map((event: TelemetryEvent) => event.name)).toEqual([
      'acme.application.list-view',
      'acme.application.create',
      'acme.group.create-failed',
      'acme.auth.sign-in',
      'acme.link.open',
      'acme.application.template-pick',
    ]);
    expect(sent[0][2].attributes.data).toEqual({error_code: 'GRP-1004', resource_type: 'group', status: '409'});
    expect(sent[0][4].attributes.data).toEqual({host: 'docs.example.com', path: '/guides/{id}'});
    expect(sent[0][0].attributes.user).toEqual({id: USER});
    expect(sent[0][0].attributes.organization).toEqual({id: ORG});
    expect(sent[0][0].context).toEqual({platform: 'Acme'});
  });

  it('leaves out excluded and disabled kinds, and renames', async () => {
    const {sent, telemetry} = build({
      apiEvents: {exclude: ['role.*']},
      authEvents: {exclude: ['session-expired']},
      links: {names: {'https://example.com/pricing': 'plan.upgrade-click'}},
      pages: {exclude: ['/settings/**'], names: {'/home': 'organization.overview-view'}},
    });
    telemetry.page('/settings/general/advanced');
    telemetry.page('/home');
    telemetry.api('DELETE', 'https://api.example.com/roles/r1', undefined, {ok: true});
    telemetry.auth('session-expired');
    telemetry.link('https://example.com/pricing');
    telemetry.link('https://app.example.com/inside');
    await telemetry.flush();
    expect(sent[0].map((event: TelemetryEvent) => event.name)).toEqual([
      'organization.overview-view',
      'plan.upgrade-click',
    ]);

    const off = build({pages: {enabled: false}});
    off.telemetry.page('/home');
    await off.telemetry.flush();
    expect(off.sent).toHaveLength(0);
  });

  it('names an API event from config first, then from the API, then by the built-in rules', async () => {
    const {sent, telemetry} = build({
      apiEvents: {names: {'POST /import/*': 'configuration.import', 'role.delete': 'role.remove'}},
    });
    const ok = (event?: string): {event?: string; ok: true} => ({event, ok: true});
    telemetry.api('POST', 'https://api.example.com/import/managed', {}, ok('import.run'));
    telemetry.api('POST', 'https://api.example.com/applications/a1/invitations', {}, ok('application.invite'));
    telemetry.api('POST', 'https://api.example.com/applications/a1/invitations', {}, ok('Not A Name'));
    telemetry.api('DELETE', 'https://api.example.com/roles/r1', undefined, ok());
    telemetry.api('POST', 'https://api.example.com/export', {}, ok());
    telemetry.api('GET', 'https://api.example.com/applications', undefined, ok('application.list'));
    await telemetry.flush();
    expect(sent[0].map((event: TelemetryEvent) => [event.name, event.attributes.route])).toEqual([
      ['configuration.import', '/import/{id}'],
      ['application.invite', '/applications/{id}/invitations'],
      ['invitation.create', '/applications/{id}/invitations'],
      ['role.remove', '/roles/{id}'],
      ['api.export', '/export'],
    ]);
  });

  it('takes every API-specific rule from configuration', async () => {
    const {sent, telemetry} = build({
      apiEvents: {
        exclude: ['/oauth2/**', '/**/.search'],
        names: {
          'POST /gateways/*/apply': 'deployment.deploy',
          'POST /gateways/*/apply ?origin': 'deployment.promote',
          'POST /promotions': 'deployment.promote',
        },
        parentActions: {'sharing-policies': {create: 'share', delete: 'unshare', update: 'share-update'}},
        skipWhen: ['dryRun', 'preview'],
      },
    });
    const ok = {ok: true} as const;
    const api = 'https://api.example.com';
    telemetry.api('POST', `${api}/gateways/g1/apply`, '{"origin":"g0"}', ok);
    telemetry.api('POST', `${api}/gateways/g1/apply`, {}, ok);
    telemetry.api('POST', `${api}/gateways/g1/apply`, {dryRun: true}, ok);
    telemetry.api('POST', `${api}/promotions`, {preview: true}, ok);
    telemetry.api('POST', `${api}/promotions`, {}, ok);
    telemetry.api('POST', `${api}/applications/a1/sharing-policies`, {}, ok);
    telemetry.api('POST', `${api}/oauth2/token`, {}, ok);
    telemetry.api('POST', `${api}/scim/v2/Users/.search`, {}, ok);
    telemetry.api('POST', `${api}/users/search`, {}, {event: 'none', ok: true});
    await telemetry.flush();
    expect(sent[0].map((event: TelemetryEvent) => [event.name, event.attributes.route])).toEqual([
      ['deployment.promote', '/gateways/{id}/apply'],
      ['deployment.deploy', '/gateways/{id}/apply'],
      ['deployment.promote', '/promotions'],
      ['application.share', '/applications/{id}/sharing-policies'],
    ]);
  });

  it('holds events until consent, then sends them', async () => {
    let allowed = false;
    const {sent, telemetry} = build({consent: () => allowed});
    telemetry.page('/home');
    await vi.advanceTimersByTimeAsync(5000);
    expect(sent).toHaveLength(0);
    allowed = true;
    await vi.advanceTimersByTimeAsync(5000);
    expect(sent).toHaveLength(1);
  });

  it('never lets a failed send reach the app', async () => {
    const telemetry: Telemetry = new Telemetry(
      {endpoint: '/telemetry'},
      {
        apiBases: [],
        identity: {getIdentity: () => Promise.reject(new Error('no session'))},
        origin: 'https://app.example.com',
        transport: {send: () => Promise.reject(new Error('down'))},
      },
    );
    telemetry.page('/home');
    await expect(telemetry.flush()).resolves.toBeUndefined();
  });
  it('keeps reporting after a send throws, a send rejects or a batch cannot be encoded', async () => {
    const sent: string[] = [];
    let calls = 0;
    const telemetry: Telemetry = new Telemetry(
      {endpoint: '/telemetry', format: 'json'},
      {
        apiBases: [],
        identity: {getIdentity: () => Promise.resolve({})},
        origin: 'https://app.example.com',
        transport: {
          send: (body: string): Promise<void> => {
            calls += 1;
            if (calls === 1) {
              throw new Error('thrown');
            }
            if (calls === 2) {
              return Promise.reject(new Error('rejected'));
            }
            sent.push(body);
            return Promise.resolve();
          },
        },
      },
    );
    telemetry.page('/one');
    await telemetry.flush();
    telemetry.page('/two');
    await telemetry.flush();
    telemetry.page('/three');
    await telemetry.flush();
    expect(sent).toHaveLength(1);

    const broken: Telemetry = new Telemetry(
      {endpoint: '/telemetry', format: 'mapping', mapping: {template: {big: BigInt(1)}}},
      {
        apiBases: [],
        identity: {getIdentity: () => Promise.resolve({})},
        origin: 'https://app.example.com',
        transport: {send: () => Promise.resolve()},
      },
    );
    broken.page('/one');
    await expect(broken.flush()).resolves.toBeUndefined();
    broken.page('/two');
    await expect(broken.flush()).resolves.toBeUndefined();
  });

  it('sends a full batch before later events are added, so none is dropped', async () => {
    const {sent, telemetry} = build({});
    for (let i = 0; i < 201; i += 1) {
      telemetry.page(`/page-${i}`);
    }
    await telemetry.flush();
    expect(sent.flat()).toHaveLength(201);
    expect(sent.flat()[0].attributes.route).toBe('/page-0');
  });

  it('matches auth exclusions exactly', async () => {
    const {sent, telemetry} = build({authEvents: {exclude: ['sign-*', 'sign-out']}});
    telemetry.auth('sign-in');
    telemetry.auth('sign-out');
    telemetry.auth('session-expired');
    await telemetry.flush();
    expect(sent.flat().map((event: TelemetryEvent) => event.name)).toEqual(['auth.sign-in', 'auth.session-expired']);
  });

  it('stops an excluded API name, its failures and any value it is matched by', async () => {
    const {sent, telemetry} = build({
      apiEvents: {
        exclude: ['group.create', '/users/alice/**', 'role.remove', 'header.name', '/tokens/*', '/roles/r9'],
        names: {'role.delete': 'role.remove'},
      },
    });
    const failed = {ok: false, status: 409} as const;
    const api = 'https://api.example.com';
    telemetry.api('POST', `${api}/groups`, {}, {ok: true});
    telemetry.api('POST', `${api}/groups`, {}, failed);
    // The literal path, as called.
    telemetry.api('POST', `${api}/Users/Alice/credentials/reset`, {}, {ok: true});
    // The final name after a configured rename.
    telemetry.api('DELETE', `${api}/roles/r1`, undefined, failed);
    // The final name from the response header.
    telemetry.api('POST', `${api}/applications`, {}, {event: 'header.name', ok: true});
    // The masked path.
    telemetry.api('DELETE', `${api}/tokens/a1b2`, undefined, {ok: true});
    // The path as called, below the API.
    telemetry.api('DELETE', `${api}/roles/r9?force=true`, undefined, {ok: true});
    telemetry.api('POST', `${api}/applications`, {}, failed);
    await telemetry.flush();
    expect(sent.flat().map((event: TelemetryEvent) => event.name)).toEqual(['application.create-failed']);
  });

  it('puts configuration before the response header, then renames a header name', async () => {
    const {sent, telemetry} = build({
      apiEvents: {names: {'application.invite': 'app.invite', 'role.delete': 'role.remove'}},
    });
    const api = 'https://api.example.com';
    telemetry.api('DELETE', `${api}/roles/r1`, undefined, {event: 'role.destroy', ok: true});
    telemetry.api('POST', `${api}/applications/a1/invitations`, {}, {event: 'application.invite', ok: true});
    telemetry.api('POST', `${api}/groups`, {}, {event: 'group.make', ok: true});
    telemetry.api('POST', `${api}/groups`, {}, {event: 'none', ok: true});
    await telemetry.flush();
    expect(sent.flat().map((event: TelemetryEvent) => event.name)).toEqual(['role.remove', 'app.invite', 'group.make']);
  });

  it('passes kinds, address words and actions from configuration to the rules', async () => {
    const {sent, telemetry} = build({
      apiEvents: {actions: ['suspend'], addressWords: ['tree'], kinds: ['connections']},
    });
    const api = 'https://api.example.com';
    telemetry.api('POST', `${api}/connections/google`, {}, {ok: true});
    telemetry.api('PUT', `${api}/organization-units/tree/engineering/operations`, {}, {ok: true});
    telemetry.api('POST', `${api}/users/u1/agents/suspend`, {}, {ok: true});
    await telemetry.flush();
    expect(sent.flat().map((event: TelemetryEvent) => [event.name, event.attributes.route])).toEqual([
      ['connection.create', '/connections/google'],
      ['organization-unit.update', '/organization-units/tree/{path}'],
      ['user.agent-suspend', '/users/{id}/agents/suspend'],
    ]);
  });

  it('reports only a well-formed code for a failed sign-in', () => {
    expect(Telemetry.signInFailureData('AUTH-1001')).toEqual({error_code: 'AUTH-1001'});
    expect(Telemetry.signInFailureData('Invalid password for alice')).toEqual({});
    expect(Telemetry.signInFailureData('AUTH-1001\n')).toEqual({});
    expect(Telemetry.signInFailureData(undefined)).toEqual({});
  });

  it('attributes an event to the identity it had when it happened', async () => {
    let organizationId = 'org-a';
    let release: () => void = () => undefined;
    const sent: TelemetryEvent[][] = [];
    const telemetry: Telemetry = new Telemetry(
      {endpoint: '/telemetry', format: 'json'},
      {
        apiBases: [],
        identity: {getIdentity: () => Promise.resolve({organizationId})},
        origin: 'https://app.example.com',
        transport: {
          send: (body: string): Promise<void> => {
            sent.push(JSON.parse(body) as TelemetryEvent[]);
            // The first send stays in flight while the organization changes.
            return sent.length === 1
              ? new Promise((resolve: () => void) => {
                  release = resolve;
                })
              : Promise.resolve();
          },
        },
      },
    );
    telemetry.page('/one');
    const first: Promise<void> = telemetry.flush();
    await vi.advanceTimersByTimeAsync(0);
    telemetry.page('/two');
    organizationId = 'org-b';
    release();
    await first;
    await telemetry.flush();
    expect(sent[1][0].attributes.organization).toEqual({id: 'org-a'});
  });

  it('leaves no timer behind once disposed', async () => {
    let allowed = false;
    const {sent, telemetry} = build({consent: () => allowed});
    telemetry.page('/home');
    await telemetry.dispose();
    expect(vi.getTimerCount()).toBe(0);
    allowed = true;
    await vi.advanceTimersByTimeAsync(10000);
    expect(sent).toHaveLength(0);
  });
  it('keeps the data an event had when it was reported', async () => {
    const {sent, telemetry} = build({});
    const data: Record<string, string> = {error_code: 'AUTH-1'};
    telemetry.auth('sign-in-failed', data);
    data['error_code'] = 'AUTH-2';
    await telemetry.flush();
    expect(sent[0][0].attributes.data).toEqual({error_code: 'AUTH-1'});
  });

  it('leaves a full batch to the disposal flush, which sends it with keepalive', async () => {
    const sends: boolean[] = [];
    const telemetry: Telemetry = new Telemetry(
      {endpoint: '/telemetry', format: 'json'},
      {
        apiBases: [],
        identity: {getIdentity: () => Promise.resolve({})},
        origin: 'https://app.example.com',
        transport: {
          send: (_body: string, keepalive: boolean): Promise<void> => {
            sends.push(keepalive);
            return Promise.resolve();
          },
        },
      },
    );
    for (let i = 0; i < 20; i += 1) {
      telemetry.page(`/page-${i}`);
    }
    await telemetry.dispose();
    expect(sends).toEqual([true]);
  });

  it('sends what waited for consent in batches of at most 20', async () => {
    let allowed = false;
    const {sent, telemetry} = build({consent: () => allowed});
    for (let i = 0; i < 45; i += 1) {
      telemetry.page(`/page-${i}`);
    }
    await vi.advanceTimersByTimeAsync(0);
    allowed = true;
    await telemetry.flush();
    expect(sent.map((batch: TelemetryEvent[]) => batch.length)).toEqual([20, 20, 5]);
  });
});
