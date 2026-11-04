// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError, ThunderIDRuntimeError} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from 'vitest';
import {ThunderIDNodeManagementClient} from '../models/management';
import ThunderIDNodeClient from '../ThunderIDNodeClient';

const BASE_URL = 'https://auth.example.com';
const TOKEN = 'session-access-token';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    headers: {'Content-Type': 'application/json'},
    status,
    statusText: status === 200 ? 'OK' : 'Error',
  });

interface Captured {
  body: unknown;
  headers: Record<string, string>;
  method: string;
  url: string;
}

const lastCall = (fetchMock: ReturnType<typeof vi.fn>): Captured => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];

  return {
    body: init.body === undefined ? undefined : JSON.parse(init.body as string),
    headers: init.headers as Record<string, string>,
    method: init.method!,
    url,
  };
};

const createClient = async (config: Record<string, unknown> = {}): Promise<ThunderIDNodeClient> => {
  const client = new ThunderIDNodeClient();
  await client.initialize({baseUrl: BASE_URL, clientId: 'test-client', ...config});

  return client;
};

describe('ThunderIDNodeClient management()', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: ThunderIDNodeClient;
  let admin: ThunderIDNodeManagementClient;
  let getAccessToken: MockInstance<(sessionId?: string) => Promise<string>>;

  beforeEach(async () => {
    fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({})));
    vi.stubGlobal('fetch', fetchMock);
    client = await createClient();
    getAccessToken = vi.spyOn(client, 'getAccessToken').mockResolvedValue(TOKEN);
    admin = client.management('session-1');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const cases: {
    body?: unknown;
    call: () => Promise<unknown>;
    method: string;
    name: string;
    url: string;
  }[] = [
    {
      call: () => admin.users.list({filter: 'username eq "a"', limit: 10, offset: 20}),
      method: 'GET',
      name: 'users.list',
      url: `${BASE_URL}/users?filter=username+eq+%22a%22&include=display&limit=10&offset=20`,
    },
    {
      call: () => admin.users.get('u 1'),
      method: 'GET',
      name: 'users.get',
      url: `${BASE_URL}/users/u%201?include=display`,
    },
    {
      body: {ouId: 'ou1', type: 'customer'},
      call: () => admin.users.create({ouId: 'ou1', type: 'customer'}),
      method: 'POST',
      name: 'users.create',
      url: `${BASE_URL}/users`,
    },
    {
      body: {attributes: {email: 'a@example.com'}},
      call: () => admin.users.update('u1', {attributes: {email: 'a@example.com'}} as never),
      method: 'PUT',
      name: 'users.update',
      url: `${BASE_URL}/users/u1`,
    },
    {call: () => admin.users.delete('u1'), method: 'DELETE', name: 'users.delete', url: `${BASE_URL}/users/u1`},
    {
      call: () => admin.users.listGroups('u1', {limit: 5}),
      method: 'GET',
      name: 'users.listGroups',
      url: `${BASE_URL}/users/u1/groups?limit=5`,
    },
    {
      call: () => admin.userTypes.list(),
      method: 'GET',
      name: 'userTypes.list',
      url: `${BASE_URL}/user-types?include=display`,
    },
    {
      call: () => admin.groups.list({limit: 2, offset: 4}),
      method: 'GET',
      name: 'groups.list',
      url: `${BASE_URL}/groups?include=display&limit=2&offset=4`,
    },
    {
      call: () => admin.groups.get('g1'),
      method: 'GET',
      name: 'groups.get',
      url: `${BASE_URL}/groups/g1?include=display`,
    },
    {
      body: {name: 'Admins', ouId: 'ou1'},
      call: () => admin.groups.create({name: 'Admins', ouId: 'ou1'} as never),
      method: 'POST',
      name: 'groups.create',
      url: `${BASE_URL}/groups`,
    },
    {
      body: {name: 'Ops'},
      call: () => admin.groups.update('g1', {name: 'Ops'} as never),
      method: 'PUT',
      name: 'groups.update',
      url: `${BASE_URL}/groups/g1`,
    },
    {call: () => admin.groups.delete('g1'), method: 'DELETE', name: 'groups.delete', url: `${BASE_URL}/groups/g1`},
    {
      call: () => admin.groups.listMembers('g1', {limit: 3}),
      method: 'GET',
      name: 'groups.listMembers',
      url: `${BASE_URL}/groups/g1/members?include=display&limit=3`,
    },
    {
      body: {members: [{id: 'u1', type: 'user'}]},
      call: () => admin.groups.addMembers('g1', [{id: 'u1', type: 'user'}]),
      method: 'POST',
      name: 'groups.addMembers',
      url: `${BASE_URL}/groups/g1/members/add`,
    },
    {
      body: {members: [{id: 'a1', type: 'agent'}]},
      call: () => admin.groups.removeMembers('g1', [{id: 'a1', type: 'agent'}]),
      method: 'POST',
      name: 'groups.removeMembers',
      url: `${BASE_URL}/groups/g1/members/remove`,
    },
    {
      call: () => admin.roles.list({limit: 1}),
      method: 'GET',
      name: 'roles.list',
      url: `${BASE_URL}/roles?include=display&limit=1`,
    },
    {call: () => admin.roles.get('r1'), method: 'GET', name: 'roles.get', url: `${BASE_URL}/roles/r1?include=display`},
    {
      body: {name: 'Auditor', ouId: 'ou1'},
      call: () => admin.roles.create({name: 'Auditor', ouId: 'ou1'} as never),
      method: 'POST',
      name: 'roles.create',
      url: `${BASE_URL}/roles`,
    },
    {
      body: {name: 'Reader'},
      call: () => admin.roles.update('r1', {name: 'Reader'} as never),
      method: 'PUT',
      name: 'roles.update',
      url: `${BASE_URL}/roles/r1`,
    },
    {call: () => admin.roles.delete('r1'), method: 'DELETE', name: 'roles.delete', url: `${BASE_URL}/roles/r1`},
    {
      call: () => admin.roles.listAssignments('r1', {limit: 10, type: 'group'}),
      method: 'GET',
      name: 'roles.listAssignments',
      url: `${BASE_URL}/roles/r1/assignments?include=display&limit=10&type=group`,
    },
    {
      body: {assignments: [{id: 'u1', type: 'user'}]},
      call: () => admin.roles.addAssignments('r1', [{id: 'u1', type: 'user'}]),
      method: 'POST',
      name: 'roles.addAssignments',
      url: `${BASE_URL}/roles/r1/assignments/add`,
    },
    {
      body: {assignments: [{id: 'g1', type: 'group'}]},
      call: () => admin.roles.removeAssignments('r1', [{id: 'g1', type: 'group'}]),
      method: 'POST',
      name: 'roles.removeAssignments',
      url: `${BASE_URL}/roles/r1/assignments/remove`,
    },
    {
      call: () => admin.agents.list({offset: 10}),
      method: 'GET',
      name: 'agents.list',
      url: `${BASE_URL}/agents?include=display&offset=10`,
    },
    {
      call: () => admin.agents.get('a1'),
      method: 'GET',
      name: 'agents.get',
      url: `${BASE_URL}/agents/a1?include=display`,
    },
    {
      body: {name: 'Concierge', ouId: 'ou1', type: 'assistant'},
      call: () => admin.agents.create({name: 'Concierge', ouId: 'ou1', type: 'assistant'} as never),
      method: 'POST',
      name: 'agents.create',
      url: `${BASE_URL}/agents`,
    },
    {
      body: {name: 'Butler'},
      call: () => admin.agents.update('a1', {name: 'Butler'} as never),
      method: 'PUT',
      name: 'agents.update',
      url: `${BASE_URL}/agents/a1`,
    },
    {call: () => admin.agents.delete('a1'), method: 'DELETE', name: 'agents.delete', url: `${BASE_URL}/agents/a1`},
    {
      call: () => admin.applications.list({limit: 5, offset: 10}),
      method: 'GET',
      name: 'applications.list',
      url: `${BASE_URL}/applications?limit=5&offset=10`,
    },
    {
      call: () => admin.applications.get('app1'),
      method: 'GET',
      name: 'applications.get',
      url: `${BASE_URL}/applications/app1`,
    },
    {
      body: {name: 'My SPA'},
      call: () => admin.applications.create({name: 'My SPA'} as never),
      method: 'POST',
      name: 'applications.create',
      url: `${BASE_URL}/applications`,
    },
    {
      body: {name: 'Renamed'},
      call: () => admin.applications.update('app1', {name: 'Renamed'} as never),
      method: 'PUT',
      name: 'applications.update',
      url: `${BASE_URL}/applications/app1`,
    },
    {
      call: () => admin.applications.delete('app1'),
      method: 'DELETE',
      name: 'applications.delete',
      url: `${BASE_URL}/applications/app1`,
    },
    {
      body: {clientId: 'https://client.example.com/metadata.json'},
      call: () => admin.applications.previewCimdDocument('https://client.example.com/metadata.json'),
      method: 'POST',
      name: 'applications.previewCimdDocument',
      url: `${BASE_URL}/cimd/preview`,
    },
    {
      call: () => admin.applications.listSharingPolicies('app1', {limit: 3}),
      method: 'GET',
      name: 'applications.listSharingPolicies',
      url: `${BASE_URL}/applications/app1/sharing-policies?limit=3`,
    },
    {
      body: {version: 1},
      call: () => admin.applications.createSharingPolicy('app1', {version: 1} as never),
      method: 'POST',
      name: 'applications.createSharingPolicy',
      url: `${BASE_URL}/applications/app1/sharing-policies`,
    },
    {
      call: () => admin.applications.getSharingPolicy('app1', 'p1'),
      method: 'GET',
      name: 'applications.getSharingPolicy',
      url: `${BASE_URL}/applications/app1/sharing-policies/p1`,
    },
    {
      body: {version: 2},
      call: () => admin.applications.updateSharingPolicy('app1', 'p1', {version: 2}),
      method: 'PUT',
      name: 'applications.updateSharingPolicy',
      url: `${BASE_URL}/applications/app1/sharing-policies/p1`,
    },
    {
      call: () => admin.applications.deleteSharingPolicy('app1', 'p1'),
      method: 'DELETE',
      name: 'applications.deleteSharingPolicy',
      url: `${BASE_URL}/applications/app1/sharing-policies/p1`,
    },
    {
      call: () => admin.applications.getOverlayRules('app1', 'ou2'),
      method: 'GET',
      name: 'applications.getOverlayRules',
      url: `${BASE_URL}/applications/app1/overlay-rules?ouId=ou2`,
    },
    {
      call: () => admin.agents.listGroups('a1'),
      method: 'GET',
      name: 'agents.listGroups',
      url: `${BASE_URL}/agents/a1/groups`,
    },
    {
      call: () => admin.agents.listRoles('a1', {limit: 7}),
      method: 'GET',
      name: 'agents.listRoles',
      url: `${BASE_URL}/agents/a1/roles?limit=7`,
    },
    {
      call: () => admin.agentTypes.list(),
      method: 'GET',
      name: 'agentTypes.list',
      url: `${BASE_URL}/agent-types?include=display`,
    },
    {
      call: () => admin.flows.list({flowType: 'AUTHENTICATION'}),
      method: 'GET',
      name: 'flows.list',
      url: `${BASE_URL}/flows?flowType=AUTHENTICATION`,
    },
    {
      body: {displayName: 'Default', handle: 'default', ouId: 'ou1', schema: {}},
      call: () => admin.agentTypes.create({displayName: 'Default', handle: 'default', ouId: 'ou1', schema: {}}),
      method: 'POST',
      name: 'agentTypes.create',
      url: `${BASE_URL}/agent-types`,
    },
    {
      call: () => admin.agentTypes.delete('t1'),
      method: 'DELETE',
      name: 'agentTypes.delete',
      url: `${BASE_URL}/agent-types/t1`,
    },
    {
      call: () => admin.users.listByPath('eng/plat form', {limit: 2}),
      method: 'GET',
      name: 'users.listByPath',
      url: `${BASE_URL}/users/tree/eng/plat%20form?include=display&limit=2`,
    },
    {
      body: {type: 'customer'},
      call: () => admin.users.createByPath('eng', {type: 'customer'}),
      method: 'POST',
      name: 'users.createByPath',
      url: `${BASE_URL}/users/tree/eng`,
    },
    {
      call: () => admin.users.listSharingPolicies('u1'),
      method: 'GET',
      name: 'users.listSharingPolicies',
      url: `${BASE_URL}/users/u1/sharing-policies`,
    },
    {
      body: {version: 2},
      call: () => admin.users.updateSharingPolicy('u1', 'p1', {version: 2}),
      method: 'PUT',
      name: 'users.updateSharingPolicy',
      url: `${BASE_URL}/users/u1/sharing-policies/p1`,
    },
    {
      call: () => admin.users.getOverlayRules('u1', 'ou2'),
      method: 'GET',
      name: 'users.getOverlayRules',
      url: `${BASE_URL}/users/u1/overlay-rules?ouId=ou2`,
    },
    {
      call: () => admin.organizationUnits.list({filter: 'handle eq "eng"'}),
      method: 'GET',
      name: 'organizationUnits.list',
      url: `${BASE_URL}/organization-units?filter=handle+eq+%22eng%22`,
    },
    {
      call: () => admin.organizationUnits.getByPath('eng/platform'),
      method: 'GET',
      name: 'organizationUnits.getByPath',
      url: `${BASE_URL}/organization-units/tree/eng/platform`,
    },
    {
      call: () => admin.organizationUnits.listChildren({path: 'eng'}, {limit: 3}),
      method: 'GET',
      name: 'organizationUnits.listChildren',
      url: `${BASE_URL}/organization-units/tree/eng/ous?limit=3`,
    },
    {
      call: () => admin.organizationUnits.listUsers({ouId: 'ou1'}),
      method: 'GET',
      name: 'organizationUnits.listUsers',
      url: `${BASE_URL}/organization-units/ou1/users?include=display`,
    },
    {
      call: () => admin.resourceServers.listActions('rs1', {kind: 'tool', resourceId: 'r1'}),
      method: 'GET',
      name: 'resourceServers.listActions',
      url: `${BASE_URL}/resource-servers/rs1/resources/r1/actions?kind=tool`,
    },
    {
      call: () => admin.resourceServers.deleteAction('rs1', 'a1'),
      method: 'DELETE',
      name: 'resourceServers.deleteAction',
      url: `${BASE_URL}/resource-servers/rs1/actions/a1`,
    },
    {
      call: () => admin.connections.list({category: 'http'}),
      method: 'GET',
      name: 'connections.list',
      url: `${BASE_URL}/connections?category=http`,
    },
    {
      call: () => admin.connections.listByType('google'),
      method: 'GET',
      name: 'connections.listByType',
      url: `${BASE_URL}/connections/google`,
    },
    {
      call: () => admin.connections.listUsages('oidc', 'c1'),
      method: 'GET',
      name: 'connections.listUsages',
      url: `${BASE_URL}/connections/oidc/c1/usages`,
    },
    {
      body: {version: 2},
      call: () => admin.flows.restoreVersion('f1', 2),
      method: 'POST',
      name: 'flows.restoreVersion',
      url: `${BASE_URL}/flows/f1/restore`,
    },
    {
      call: () => admin.notificationTemplates.get('email', 't1'),
      method: 'GET',
      name: 'notificationTemplates.get',
      url: `${BASE_URL}/notification-templates/email/templates/t1`,
    },
    {
      call: () => admin.design.listThemes({limit: 4}),
      method: 'GET',
      name: 'design.listThemes',
      url: `${BASE_URL}/design/themes?limit=4`,
    },
    {
      call: () => admin.design.resolve('OU', 'ou1'),
      method: 'GET',
      name: 'design.resolve',
      url: `${BASE_URL}/design/resolve?id=ou1&type=OU`,
    },
    {
      body: {value: 'Hi'},
      call: () => admin.i18n.setTranslation('en-US', 'auth', 'title', {value: 'Hi'}),
      method: 'POST',
      name: 'i18n.setTranslation',
      url: `${BASE_URL}/i18n/languages/en-US/translations/ns/auth/keys/title`,
    },
    {
      call: () => admin.serverConfig.get('flow'),
      method: 'GET',
      name: 'serverConfig.get',
      url: `${BASE_URL}/server-config/flow`,
    },
    {
      call: () => admin.gateways.getConfigurationDiff('gw1', {version: 'latest'}),
      method: 'GET',
      name: 'gateways.getConfigurationDiff',
      url: `${BASE_URL}/gateways/gw1/diff?version=latest`,
    },
    {
      body: {value: 'x'},
      call: () => admin.gateways.updateSecret('gw1', 'S', {value: 'x'}),
      method: 'PUT',
      name: 'gateways.updateSecret',
      url: `${BASE_URL}/gateways/gw1/secrets/S`,
    },
    {
      call: () => admin.gateways.getMaster('gw1'),
      method: 'GET',
      name: 'gateways.getMaster',
      url: `${BASE_URL}/gateways/gw1/master`,
    },
    {
      call: () => admin.gateways.getMasterHistory('gw1'),
      method: 'GET',
      name: 'gateways.getMasterHistory',
      url: `${BASE_URL}/gateways/gw1/master/history`,
    },
    {
      call: () => admin.gateways.getMasterResource('gw1', 'application', 'app/1'),
      method: 'GET',
      name: 'gateways.getMasterResource',
      url: `${BASE_URL}/gateways/gw1/master/resources/application/app%2F1`,
    },
    {
      body: {childUnits: {mode: 'all'}},
      call: () => admin.roles.createSharingPolicy('r1', {childUnits: {mode: 'all'}}),
      method: 'POST',
      name: 'roles.createSharingPolicy',
      url: `${BASE_URL}/roles/r1/sharing-policies`,
    },
    {
      call: () => admin.roles.listSharingPolicies('r1', {limit: 3}),
      method: 'GET',
      name: 'roles.listSharingPolicies',
      url: `${BASE_URL}/roles/r1/sharing-policies?limit=3`,
    },
    {
      call: () => admin.roles.getOverlayRules('r1', 'ou2'),
      method: 'GET',
      name: 'roles.getOverlayRules',
      url: `${BASE_URL}/roles/r1/overlay-rules?ouId=ou2`,
    },
    {
      call: () => admin.flows.deleteSharingPolicy('f1', 'p1'),
      method: 'DELETE',
      name: 'flows.deleteSharingPolicy',
      url: `${BASE_URL}/flows/f1/sharing-policies/p1`,
    },
    {
      call: () => admin.flows.getVariables('f1', 'ou2'),
      method: 'GET',
      name: 'flows.getVariables',
      url: `${BASE_URL}/flows/f1/variables?ouId=ou2`,
    },
    {
      body: {ouId: 'ou2', values: {supportEmail: 'help@example.com'}},
      call: () => admin.flows.updateVariables('f1', 'ou2', {supportEmail: 'help@example.com'}),
      method: 'PUT',
      name: 'flows.updateVariables',
      url: `${BASE_URL}/flows/f1/variables`,
    },
    {
      call: () => admin.groups.listByPath('eng/plat form', {limit: 2}),
      method: 'GET',
      name: 'groups.listByPath',
      url: `${BASE_URL}/groups/tree/eng/plat%20form?include=display&limit=2`,
    },
    {
      body: {name: 'Sports'},
      call: () => admin.groups.createByPath('eng', {name: 'Sports'}),
      method: 'POST',
      name: 'groups.createByPath',
      url: `${BASE_URL}/groups/tree/eng`,
    },
    {
      call: () => admin.projects.list({limit: 5}),
      method: 'GET',
      name: 'projects.list',
      url: `${BASE_URL}/projects?limit=5`,
    },
    {
      body: {displayName: 'Shop'},
      call: () => admin.projects.update('p1', {displayName: 'Shop'}),
      method: 'PUT',
      name: 'projects.update',
      url: `${BASE_URL}/projects/p1`,
    },
    {
      call: () => admin.authorizationDetailTypes.get('t1'),
      method: 'GET',
      name: 'authorizationDetailTypes.get',
      url: `${BASE_URL}/authorization-detail-types/t1`,
    },
    {
      call: () => admin.authorizationDetailTypes.delete('t1'),
      method: 'DELETE',
      name: 'authorizationDetailTypes.delete',
      url: `${BASE_URL}/authorization-detail-types/t1`,
    },
    {
      call: () => admin.credentialConfigurations.list(),
      method: 'GET',
      name: 'credentialConfigurations.list',
      url: `${BASE_URL}/openid4vci/credential-configurations`,
    },
    {
      body: {handle: 'pid', ouId: 'ou1', vct: 'urn:pid'},
      call: () => admin.credentialConfigurations.update('vc1', {handle: 'pid', ouId: 'ou1', vct: 'urn:pid'}),
      method: 'PUT',
      name: 'credentialConfigurations.update',
      url: `${BASE_URL}/openid4vci/credential-configurations/vc1`,
    },
    {
      call: () => admin.presentationDefinitions.delete('vp1'),
      method: 'DELETE',
      name: 'presentationDefinitions.delete',
      url: `${BASE_URL}/openid4vp/presentation-definitions/vp1`,
    },
    {
      body: {client_name: 'App', redirect_uris: ['https://app/cb']},
      call: () => admin.clientRegistrations.register({clientName: 'App', redirectUris: ['https://app/cb']}),
      method: 'POST',
      name: 'clientRegistrations.register',
      url: `${BASE_URL}/oauth2/dcr/register`,
    },
    {
      body: {client_id: 'c1', redirect_uris: ['https://app/cb']},
      call: () => admin.clientRegistrations.update('c1', {redirectUris: ['https://app/cb']}),
      method: 'PUT',
      name: 'clientRegistrations.update',
      url: `${BASE_URL}/oauth2/dcr/register/c1`,
    },
    {
      call: () => admin.variables.list({names: ['A', 'B']}),
      method: 'GET',
      name: 'variables.list',
      url: `${BASE_URL}/variables?names=A%2CB`,
    },
    {
      call: () => admin.secrets.delete('S'),
      method: 'DELETE',
      name: 'secrets.delete',
      url: `${BASE_URL}/secrets/S`,
    },
    {
      call: () => admin.configuration.listVersions(),
      method: 'GET',
      name: 'configuration.listVersions',
      url: `${BASE_URL}/configuration-versions`,
    },
    {
      body: {roles: ['r1']},
      call: () => admin.configuration.export({roles: ['r1']}),
      method: 'POST',
      name: 'configuration.export',
      url: `${BASE_URL}/export`,
    },
    {
      body: {resourceKey: 'k', resourceType: 'role'},
      call: () => admin.configuration.deleteImported({resourceKey: 'k', resourceType: 'role'}),
      method: 'POST',
      name: 'configuration.deleteImported',
      url: `${BASE_URL}/import/delete`,
    },
  ];

  it.each(cases)('$name sends $method $url with the session bearer token', async ({body, call, method, url}) => {
    await call();

    const captured: Captured = lastCall(fetchMock);

    expect(getAccessToken).toHaveBeenCalledWith('session-1');
    expect(captured.url).toBe(url);
    expect(captured.method).toBe(method);
    expect(captured.headers['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect(captured.body).toEqual(body);
  });

  it('reads the access token on every call rather than once per management client', async () => {
    await admin.users.list();
    getAccessToken.mockResolvedValue('rotated-token');
    await admin.users.list();

    expect(lastCall(fetchMock).headers['Authorization']).toBe('Bearer rotated-token');
  });

  it('returns the parsed server record', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({id: 'g1', name: 'Admins'}));

    await expect(admin.groups.get('g1')).resolves.toEqual({id: 'g1', name: 'Admins'});
  });

  it('resolves the collection URL from an explicit url, then endpoints, then baseUrl', async () => {
    const overridden = await createClient({endpoints: {roles: 'https://rs.example.com/v2/roles'}});
    vi.spyOn(overridden, 'getAccessToken').mockResolvedValue(TOKEN);
    const scoped: ThunderIDNodeManagementClient = overridden.management('session-1');

    await scoped.roles.get('r1');
    expect(lastCall(fetchMock).url).toBe('https://rs.example.com/v2/roles/r1?include=display');

    await scoped.roles.get('r1', {url: 'https://other.example.com/roles'});
    expect(lastCall(fetchMock).url).toBe('https://other.example.com/roles/r1?include=display');

    await scoped.groups.get('g1');
    expect(lastCall(fetchMock).url).toBe(`${BASE_URL}/groups/g1?include=display`);
  });

  it('uses a per-call fetcher, and the fetcher cannot replace the bearer token', async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({})));

    await admin.users.list({fetcher, headers: {Authorization: 'Bearer forged'}} as never);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(lastCall(fetcher).headers['Authorization']).toBe(`Bearer ${TOKEN}`);
  });

  it('refuses a session without an access token before sending anything', async () => {
    getAccessToken.mockResolvedValue(undefined as never);

    const error: unknown = await admin.users.list().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ThunderIDRuntimeError);
    expect((error as ThunderIDRuntimeError).code).toBe('NODE-MANAGEMENT-RC-NF01');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a missing resource identifier before reading the token or sending anything', async () => {
    const error: unknown = await admin.users.delete(undefined as never).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ThunderIDAPIError);
    expect((error as ThunderIDAPIError).code).toBe('deleteUser-ValidationError-002');
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'deleteRole-ForbiddenError-001'],
    [404, 'deleteRole-NotFoundError-001'],
    [500, 'deleteRole-ResponseError-001'],
  ])(
    'maps HTTP %i to a ThunderIDAPIError with code %s and keeps the token out of the message',
    async (status, code) => {
      fetchMock.mockResolvedValueOnce(jsonResponse({message: 'nope'}, status));

      const error: unknown = await admin.roles.delete('r1').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ThunderIDAPIError);
      expect((error as ThunderIDAPIError).code).toBe(code);
      expect((error as ThunderIDAPIError).statusCode).toBe(status);
      expect(String((error as Error).message)).not.toContain(TOKEN);
    },
  );

  it('runs an account lifecycle operation through its flow and reports whether the email was sent', async () => {
    // The flow configuration, the flow listing, then the flow execution.
    fetchMock
      .mockResolvedValueOnce(jsonResponse({merged: {userSuspendFlow: {defaultHandle: 'suspend-user'}}}))
      .mockResolvedValueOnce(jsonResponse({flows: [{flowType: 'ADMINISTRATION', handle: 'suspend-user', id: 'f1'}]}))
      .mockResolvedValueOnce(jsonResponse({data: {additionalData: {emailSent: 'false'}}, flowStatus: 'COMPLETE'}));

    await expect(admin.users.suspend('u1', {operatorNote: 'Ticket 7'})).resolves.toEqual({emailSent: false});

    const captured: Captured = lastCall(fetchMock);
    expect(captured.url).toBe(`${BASE_URL}/flow/execute`);
    expect(captured.headers['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect(captured.body).toEqual({flowId: 'f1', inputs: {operatorNote: 'Ticket 7', subject: 'u1'}});
    expect(fetchMock.mock.calls.map(([url]) => url as string)).toEqual([
      `${BASE_URL}/server-config/flow`,
      `${BASE_URL}/flows?flowType=ADMINISTRATION&limit=100&offset=0`,
      `${BASE_URL}/flow/execute`,
    ]);
  });

  it('refuses an account lifecycle operation when no flow is configured', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({merged: {}}));

    await expect(admin.agents.unlock('a1')).rejects.toMatchObject({code: 'unlockAgent-NotConfiguredError-001'});
  });

  it('regenerates an application client secret by reading the application and writing it back', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'app1',
          inboundAuthConfig: [{config: {clientId: 'c1'}, type: 'oauth2'}],
          name: 'My SPA',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({id: 'app1', name: 'My SPA'}));

    const {clientSecret} = await admin.applications.regenerateClientSecret('app1');

    const captured: Captured = lastCall(fetchMock);
    expect(captured.method).toBe('PUT');
    expect(captured.url).toBe(`${BASE_URL}/applications/app1`);
    expect(captured.headers['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect(captured.body).toEqual({
      inboundAuthConfig: [{config: {clientId: 'c1', clientSecret}, type: 'oauth2'}],
      name: 'My SPA',
    });
  });

  it('regenerates an application flow secret by reading the application and writing it back', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({id: 'app1', name: 'My SPA'}))
      .mockResolvedValueOnce(jsonResponse({id: 'app1', name: 'My SPA'}));

    const {flowSecret} = await admin.applications.regenerateFlowSecret('app1');

    const captured: Captured = lastCall(fetchMock);
    expect(captured.method).toBe('PUT');
    expect(captured.url).toBe(`${BASE_URL}/applications/app1`);
    expect(captured.body).toEqual({flowSecret, name: 'My SPA'});
  });

  it('suspends an application through its account lifecycle flow', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({merged: {applicationSuspendFlow: {defaultHandle: 'suspend-app'}}}))
      .mockResolvedValueOnce(jsonResponse({flows: [{flowType: 'ADMINISTRATION', handle: 'suspend-app', id: 'f2'}]}))
      .mockResolvedValueOnce(jsonResponse({data: {additionalData: {emailSent: 'true'}}, flowStatus: 'COMPLETE'}));

    await expect(admin.applications.suspend('app1', {operatorNote: 'Ticket 9'})).resolves.toEqual({emailSent: true});
    expect(lastCall(fetchMock).body).toEqual({flowId: 'f2', inputs: {operatorNote: 'Ticket 9', subject: 'app1'}});
  });

  it('refuses an application lifecycle operation when no flow is configured', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({merged: {}}));

    await expect(admin.applications.unsuspend('app1')).rejects.toMatchObject({
      code: 'unsuspendApplication-NotConfiguredError-001',
    });
  });

  it('refuses a missing application identifier before reading the token or sending anything', async () => {
    await expect(admin.applications.delete('' as never)).rejects.toMatchObject({
      code: 'deleteApplication-ValidationError-002',
    });
    await expect(admin.applications.getSharingPolicy('app1', undefined as never)).rejects.toMatchObject({
      code: 'getApplicationSharingPolicy-ValidationError-002',
    });
    await expect(admin.applications.regenerateClientSecret(undefined as never)).rejects.toMatchObject({
      code: 'regenerateClientSecret-ValidationError-002',
    });
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a missing identifier on the new accessors before sending anything', async () => {
    await expect(admin.gateways.getSecret('gw1', '' as never)).rejects.toMatchObject({
      code: 'getGatewaySecret-ValidationError-002',
    });
    await expect(admin.connections.get('google', undefined as never)).rejects.toMatchObject({
      code: 'getConnection-ValidationError-002',
    });
    await expect(admin.clientRegistrations.get('' as never)).rejects.toMatchObject({
      code: 'getClientRegistration-ValidationError-002',
    });
    await expect(admin.gateways.getMasterResource('gw1', 'application', '' as never)).rejects.toMatchObject({
      code: 'getGatewayMasterResource-ValidationError-002',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
