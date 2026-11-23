// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import TelemetryApiRules from '../TelemetryApiRules';

const API = 'https://api.example.com';
const ID = '019a2b3c-4d5e-7f60-8a9b-0c1d2e3f4a5b';

const rules: TelemetryApiRules = new TelemetryApiRules([API, 'https://env.example.com/v1'], 'https://app.example.com');

const configured: TelemetryApiRules = new TelemetryApiRules([API], 'https://app.example.com', {
  actions: ['suspend'],
  addressWords: ['tree'],
  kinds: ['connections'],
});

const name = (method: string, path: string): string | undefined => rules.classify(method, `${API}${path}`)?.name;

describe('TelemetryApiRules', () => {
  it('names creates, updates and deletes from the collection, with a path template', () => {
    expect(rules.classify('POST', `${API}/applications`)).toEqual({
      data: {resource_type: 'application'},
      name: 'application.create',
      route: '/applications',
    });
    expect(rules.classify('DELETE', `${API}/roles/${ID}`)).toEqual({
      data: {resource_type: 'role'},
      name: 'role.delete',
      route: '/roles/{id}',
    });
    expect(name('PATCH', `/organization-units/${ID}`)).toBe('organization-unit.update');
    expect(name('PUT', '/variables/API_KEY')).toBe('variable.update');
    expect(name('DELETE', '/secrets')).toBe('secret.delete');
  });

  it('names every kind of resource the same way, whatever the shape of its path', () => {
    const cases: [string, string, string, Record<string, string>][] = [
      ['POST', '/connections/google', 'connection.create', {kind: 'google', resource_type: 'connection'}],
      [
        'PUT',
        `/connections/sms-gateway/${ID}`,
        'connection.update',
        {kind: 'sms-gateway', resource_type: 'connection'},
      ],
      ['POST', '/design/themes', 'theme.create', {resource_type: 'theme'}],
      [
        'DELETE',
        `/openid4vci/credential-configurations/${ID}`,
        'credential-configuration.delete',
        {resource_type: 'credential-configuration'},
      ],
      ['POST', '/scim/v2/Users', 'user.create', {resource_type: 'user'}],
      ['PUT', '/server-config/branding', 'server-config.update', {resource_type: 'server-config'}],
      [
        'POST',
        `/resource-servers/${ID}/resources/${ID}/actions`,
        'action.create',
        {parent_type: 'resource', resource_type: 'action'},
      ],
      [
        'POST',
        '/notification-templates/email/templates',
        'template.create',
        {parent_type: 'notification-template', resource_type: 'template'},
      ],
      [
        'PUT',
        '/organization-units/tree/engineering/backend',
        'organization-unit.update',
        {resource_type: 'organization-unit'},
      ],
      ['PUT', '/users/me', 'user.update', {resource_type: 'user'}],
    ];
    for (const [method, path, expected, data] of cases) {
      const call = configured.classify(method, `${API}${path}`);
      expect([path, call?.name, call?.data]).toEqual([path, expected, data]);
    }
  });

  it('names a sub-resource for itself, with its parent, unless configured as a parent action', () => {
    expect(rules.classify('POST', `${API}/applications/${ID}/sharing-policies`)).toEqual({
      data: {parent_type: 'application', resource_type: 'sharing-policy'},
      name: 'sharing-policy.create',
      route: '/applications/{id}/sharing-policies',
    });
    const sharing = new TelemetryApiRules([API], 'https://app.example.com', {
      kinds: ['connections'],
      parentActions: {'sharing-policies': {create: 'share', delete: 'unshare', update: 'share-update'}},
    });
    expect(sharing.classify('POST', `${API}/applications/${ID}/sharing-policies`)).toEqual({
      data: {resource_type: 'application'},
      name: 'application.share',
      route: '/applications/{id}/sharing-policies',
    });
    expect(sharing.classify('PUT', `${API}/roles/${ID}/sharing-policies/${ID}`)?.name).toBe('role.share-update');
    expect(sharing.classify('DELETE', `${API}/connections/oidc/${ID}/sharing-policies/${ID}`)?.name).toBe(
      'connection.unshare',
    );
  });

  it('names actions on a resource for what they act on', () => {
    expect(name('POST', `/applications/${ID}/client-secret/regenerate`)).toBe('application.client-secret-regenerate');
    expect(name('POST', `/users/${ID}/update-credentials`)).toBe('user.update-credentials');
    expect(name('POST', `/flows/${ID}/restore`)).toBe('flow.restore');
    expect(name('POST', `/users/me/agents/${ID}/suspend`)).toBe('agent.suspend');
    expect(name('PUT', `/projects/${ID}/auto-sync`)).toBe('project.auto-sync-update');
    expect(rules.classify('POST', `${API}/groups/${ID}/members/add`)).toEqual({
      data: {resource_type: 'group', sub_type: 'member'},
      name: 'group.member-add',
      route: '/groups/{id}/members/add',
    });
    expect(name('POST', `/groups/${ID}/members/remove`)).toBe('group.member-remove');
    expect(name('POST', `/roles/${ID}/assignments/add`)).toBe('role.assignment-add');
    expect(configured.classify('POST', `${API}/users/me/agents/suspend`)?.name).toBe('user.agent-suspend');
  });

  it('reads the word after a top-level collection as a kind only when the collection is configured', () => {
    expect(configured.classify('POST', `${API}/connections/google`)).toEqual({
      data: {kind: 'google', resource_type: 'connection'},
      name: 'connection.create',
      route: '/connections/google',
    });
    expect(rules.classify('POST', `${API}/connections/google`)).toEqual({
      data: {resource_type: 'connection'},
      name: 'connection.create',
      route: '/connections/{id}',
    });
    expect(rules.classify('DELETE', `${API}/groups/alice/${ID}`)).toEqual({
      data: {resource_type: 'group'},
      name: 'group.delete',
      route: '/groups/{id}/{path}',
    });
    expect(configured.classify('POST', `${API}/users/alice`)).toEqual({
      data: {resource_type: 'user'},
      name: 'user.create',
      route: '/users/{id}',
    });
  });

  it('names nothing from a path after a configured address word', () => {
    expect(configured.classify('PUT', `${API}/organization-units/tree/engineering/operations`)).toEqual({
      data: {resource_type: 'organization-unit'},
      name: 'organization-unit.update',
      route: '/organization-units/tree/{path}',
    });
    expect(configured.classify('POST', `${API}/organization-units/tree/engineering`)?.name).toBe(
      'organization-unit.create',
    );
    expect(configured.classify('DELETE', `${API}/organization-units/tree/engineering`)?.name).toBe(
      'organization-unit.delete',
    );
    expect(configured.classify('PUT', `${API}/organization-units/tree`)).toEqual({
      data: {resource_type: 'organization-unit'},
      name: 'organization-unit.update',
      route: '/organization-units/tree/{path}',
    });
  });

  it('reads a word ending a POST to a sub-collection as an action only when it is a change word or configured', () => {
    expect(rules.classify('POST', `${API}/groups/${ID}/members/alice`)).toEqual({
      data: {parent_type: 'group', resource_type: 'member'},
      name: 'member.create',
      route: '/groups/{id}/members/{id}',
    });
    expect(rules.classify('POST', `${API}/users/${ID}/agents/suspend`)?.name).toBe('agent.create');
    expect(configured.classify('POST', `${API}/users/${ID}/agents/suspend`)).toEqual({
      data: {resource_type: 'user', sub_type: 'agent'},
      name: 'user.agent-suspend',
      route: '/users/{id}/agents/suspend',
    });
    expect(rules.classify('POST', `${API}/groups/${ID}/members/add`)?.name).toBe('group.member-add');
  });

  it('names an action on an item from its words, and keeps words after a word item out of the name', () => {
    expect(name('POST', `/gateways/${ID}/apply`)).toBe('gateway.apply');
    expect(name('POST', `/gateways/${ID}/revert`)).toBe('gateway.revert');
    expect(rules.classify('POST', 'https://env.example.com/v1/environments/dev/apply')).toEqual({
      data: {resource_type: 'environment'},
      name: 'environment.create',
      route: '/environments/{id}/{path}',
    });
    expect(name('POST', '/promotions')).toBe('promotion.create');
  });

  it('names a call with no resource type from its words', () => {
    expect(rules.classify('POST', `${API}/import`)).toEqual({data: {}, name: 'api.import', route: '/import'});
    expect(name('POST', '/import/managed')).toBe('api.import-managed');
    expect(name('POST', '/export')).toBe('api.export');
    expect(name('DELETE', '/maintenance')).toBe('api.maintenance-delete');
    expect(rules.classify('PUT', `${API}/dcr/register/c1d2e3f4a5b6c7d8e9f0`)).toEqual({
      data: {method: 'PUT'},
      name: 'api.call',
      route: '/dcr/{id}/{id}',
    });
  });

  it('reports any other change as api.call, keeping only the first word of the path', () => {
    expect(rules.classify('POST', `${API}/import/${ID}/retry-later`)).toEqual({
      data: {method: 'POST'},
      name: 'api.call',
      route: '/import/{id}/{id}',
    });
    expect(rules.classify('POST', `${API}/import/${ID}/applications`)?.route).toBe('/import/{id}/{id}');
    expect(rules.classify('POST', `${API}/${ID}/v2/applications`)?.route).toBe('/{id}/{id}/{id}');
  });

  it('skips a label and its value in front of a sub-collection', () => {
    expect(rules.classify('DELETE', `${API}/i18n/languages/en/translations/ns/auth/keys/login.title`)).toEqual({
      data: {parent_type: 'translation', resource_type: 'key'},
      name: 'key.delete',
      route: '/i18n/languages/{id}/translations/ns/{id}/keys/{id}',
    });
    expect(name('POST', '/i18n/languages/en/translations/ns/auth/keys/login.title')).toBe('key.create');
    expect(name('POST', '/i18n/languages/en/translations/ns/auth/keys')).toBe('key.create');
  });

  it('names only changes, and only on a watched API', () => {
    expect(name('GET', '/applications')).toBeUndefined();
    expect(name('HEAD', '/applications')).toBeUndefined();
    expect(name('OPTIONS', '/applications')).toBeUndefined();
    expect(rules.classify('POST', 'https://other.example.com/applications')).toBeUndefined();
    expect(rules.classify('POST')).toBeUndefined();
  });

  it('reports a failure with its status and only a well-formed error code', () => {
    expect(TelemetryApiRules.failureData(409, {code: 'APP-1023', message: 'Name "x" taken'})).toEqual({
      error_code: 'APP-1023',
      status: '409',
    });
    expect(TelemetryApiRules.failureData(500, {code: 'something the user typed'})).toEqual({status: '500'});
    expect(TelemetryApiRules.failureData(undefined, undefined)).toEqual({status: 'network'});
    expect(TelemetryApiRules.failureData(400, {code: 'APP-1023\n'})).toEqual({status: '400'});
  });
  it('reads a path below the most specific watched base', () => {
    const nested: TelemetryApiRules = new TelemetryApiRules(
      ['https://api.example.com', 'https://api.example.com/tenant'],
      'https://app.example.com',
    );
    expect(nested.path('https://api.example.com/tenant/oauth2/token')).toBe('/oauth2/token');
    expect(nested.path('https://api.example.com/groups')).toBe('/groups');
  });
  it('reads a skip field from a plain or a form-encoded body', () => {
    expect(TelemetryApiRules.sets({dryRun: true}, 'dryRun')).toBe(true);
    expect(TelemetryApiRules.sets({dryRun: false}, 'dryRun')).toBe(false);
    const form: FormData = new FormData();
    form.append('dryRun', 'true');
    expect(TelemetryApiRules.sets(form, 'dryRun')).toBe(true);
    const off: FormData = new FormData();
    off.append('dryRun', 'false');
    off.append('preview', '');
    expect(TelemetryApiRules.sets(off, 'dryRun')).toBe(false);
    expect(TelemetryApiRules.sets(off, 'preview')).toBe(false);
    expect(TelemetryApiRules.sets(off, 'missing')).toBe(false);
  });

  it('names a plural handle in an address the same as any other', () => {
    expect(configured.classify('PUT', `${API}/organization-units/tree/engineering/operations`)?.route).toBe(
      '/organization-units/tree/{path}',
    );
    expect(configured.classify('PUT', `${API}/organization-units/tree/operations`)?.name).toBe(
      'organization-unit.update',
    );
  });
});
