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
    {call: () => admin.userTypes.list(), method: 'GET', name: 'userTypes.list', url: `${BASE_URL}/user-types`},
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
    {call: () => admin.roles.list({limit: 1}), method: 'GET', name: 'roles.list', url: `${BASE_URL}/roles?limit=1`},
    {call: () => admin.roles.get('r1'), method: 'GET', name: 'roles.get', url: `${BASE_URL}/roles/r1`},
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
    {call: () => admin.agentTypes.list(), method: 'GET', name: 'agentTypes.list', url: `${BASE_URL}/agent-types`},
    {
      call: () => admin.flows.list({flowType: 'AUTHENTICATION'}),
      method: 'GET',
      name: 'flows.list',
      url: `${BASE_URL}/flows?flowType=AUTHENTICATION`,
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
    expect(lastCall(fetchMock).url).toBe('https://rs.example.com/v2/roles/r1');

    await scoped.roles.get('r1', {url: 'https://other.example.com/roles'});
    expect(lastCall(fetchMock).url).toBe('https://other.example.com/roles/r1');

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
});
