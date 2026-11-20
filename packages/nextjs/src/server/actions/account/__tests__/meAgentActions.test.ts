// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import getClient from '../../../getClient';
import getAccessToken from '../../getAccessToken';
import deleteMeAgentAction from '../deleteMeAgentAction';
import getMeAgentAction from '../getMeAgentAction';
import getMeAgentsAction from '../getMeAgentsAction';
import suspendAllMeAgentsAction from '../suspendAllMeAgentsAction';
import suspendMeAgentAction from '../suspendMeAgentAction';
import unsuspendMeAgentAction from '../unsuspendMeAgentAction';
import updateMeAgentAction from '../updateMeAgentAction';

vi.mock('../../../getClient', () => ({default: vi.fn()}));
vi.mock('../../getAccessToken', () => ({default: vi.fn()}));

const baseUrl = 'https://localhost:8090';
const agent = {attributes: {name: 'Spending assistant'}, id: 'a-1', kind: 'personal-assistant', ouId: 'ou-1'};
const payload = {
  attributes: {name: 'Budget assistant'},
  description: 'Budgets',
  grantTypes: ['authorization_code'],
  redirectUris: ['https://assistant.example.com/callback'],
};

describe('personal agent server actions', () => {
  const fetchMock: Mock = vi.fn();

  const respond = (body: unknown, status = 200): void => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve(body),
      ok: status >= 200 && status < 300,
      status,
      statusText: '',
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
    });
  };

  const sent = (): {body?: unknown; method?: string; token?: string; url: string} => {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    return {
      body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
      method: init.method,
      token: (init.headers as Record<string, string>)['Authorization'],
      url,
    };
  };

  const configure = (config: Record<string, unknown> = {baseUrl}): void => {
    (getClient as unknown as Mock).mockReturnValue({
      getConfiguration: vi.fn().mockResolvedValue(config),
      initialize: vi.fn(),
      isInitialized: true,
    });
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    configure();
    (getAccessToken as unknown as Mock).mockResolvedValue('session-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses without a session and sends nothing', async () => {
    (getAccessToken as unknown as Mock).mockResolvedValue(undefined);

    expect(await getMeAgentsAction()).toEqual({statusCode: 401, success: false});
    expect(await suspendAllMeAgentsAction()).toEqual({statusCode: 401, success: false});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists the personal agents with the session's token, keeping it on the server", async () => {
    respond({agents: [agent], count: 1, startIndex: 1, totalResults: 1});

    const result = await getMeAgentsAction({limit: 5, offset: 10});

    expect(sent()).toEqual({
      body: undefined,
      method: 'GET',
      token: 'Bearer session-token',
      url: `${baseUrl}/users/me/agents?kind=personal-assistant&limit=5&offset=10`,
    });
    expect(result).toMatchObject({data: {agents: [agent], totalResults: 1}, success: true});
  });

  it('ignores paging values that are not counts', async () => {
    respond({agents: [], count: 0, startIndex: 1, totalResults: 0});

    await getMeAgentsAction({limit: -1, offset: 'x' as never});

    expect(sent().url).toBe(`${baseUrl}/users/me/agents?kind=personal-assistant`);
  });

  it('sends requests to the usersMeAgents endpoint override', async () => {
    configure({baseUrl, endpoints: {usersMeAgents: 'https://rs.example.com/users/me/agents'}});
    respond(agent);

    await getMeAgentAction('a-1');

    expect(sent().url).toBe('https://rs.example.com/users/me/agents/a-1?include=display');
  });

  it.each([
    [
      'getMeAgentAction',
      (): Promise<unknown> => getMeAgentAction('a/1'),
      'GET',
      `${baseUrl}/users/me/agents/a%2F1?include=display`,
    ],
    [
      'deleteMeAgentAction',
      (): Promise<unknown> => deleteMeAgentAction('a-1'),
      'DELETE',
      `${baseUrl}/users/me/agents/a-1`,
    ],
    [
      'suspendMeAgentAction',
      (): Promise<unknown> => suspendMeAgentAction('a-1'),
      'POST',
      `${baseUrl}/users/me/agents/a-1/suspend`,
    ],
    [
      'unsuspendMeAgentAction',
      (): Promise<unknown> => unsuspendMeAgentAction('a-1'),
      'POST',
      `${baseUrl}/users/me/agents/a-1/unsuspend`,
    ],
  ])(
    '%s addresses the one agent it was given',
    async (_name: string, run: () => Promise<unknown>, method: string, url: string) => {
      respond(undefined, 204);

      expect(await run()).toMatchObject({success: true});
      expect(sent()).toMatchObject({method, token: 'Bearer session-token', url});
    },
  );

  it.each([
    ['getMeAgentAction', (): Promise<unknown> => getMeAgentAction('' as string)],
    ['deleteMeAgentAction', (): Promise<unknown> => deleteMeAgentAction(42 as unknown as string)],
    ['suspendMeAgentAction', (): Promise<unknown> => suspendMeAgentAction('  ')],
    ['unsuspendMeAgentAction', (): Promise<unknown> => unsuspendMeAgentAction(undefined as unknown as string)],
  ])(
    '%s refuses an identifier that is not one, without a request',
    async (_name: string, run: () => Promise<unknown>) => {
      expect(await run()).toEqual({statusCode: 400, success: false});
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('suspends every personal agent and returns how many', async () => {
    respond({suspendedCount: 2});

    expect(await suspendAllMeAgentsAction()).toEqual({data: {suspendedCount: 2}, success: true});
    expect(sent()).toMatchObject({method: 'POST', url: `${baseUrl}/users/me/agents/suspend`});
  });

  it('sends only the fields an owner may change', async () => {
    respond(agent);

    await updateMeAgentAction('a-1', {...payload, clientSecret: 'stolen', owner: {id: 'someone'}} as never);

    expect(sent()).toMatchObject({body: payload, method: 'PUT', url: `${baseUrl}/users/me/agents/a-1`});
  });

  it.each([
    ['no attributes', {...payload, attributes: undefined}],
    ['attributes that are a list', {...payload, attributes: ['name']}],
    ['a description that is not text', {...payload, description: 7}],
    ['grant types that are not text', {...payload, grantTypes: [1]}],
    ['no redirect URIs', {...payload, redirectUris: undefined}],
    ['no payload', null],
  ])('refuses an update with %s, without a request', async (_name: string, body: unknown) => {
    expect(await updateMeAgentAction('a-1', body as never)).toEqual({statusCode: 400, success: false});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the status and code of a rejection without the server message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve('Delegated token'),
    });

    const result = await suspendMeAgentAction('a-1');

    expect(result).toMatchObject({statusCode: 403, success: false});
    expect(JSON.stringify(result)).not.toContain('Delegated token');
  });

  it('reports a failure that is not an API error without details', async () => {
    (getClient as unknown as Mock).mockReturnValue({
      getConfiguration: vi.fn().mockRejectedValue(new Error('storage down')),
      initialize: vi.fn(),
      isInitialized: true,
    });

    expect(await getMeAgentsAction()).toEqual({success: false});
  });

  it('initializes the client before the first request', async () => {
    const initialize: Mock = vi.fn();
    (getClient as unknown as Mock).mockReturnValue({
      getConfiguration: vi.fn().mockResolvedValue({baseUrl}),
      initialize,
      isInitialized: false,
    });
    respond(agent);

    await getMeAgentAction('a-1');

    expect(initialize).toHaveBeenCalled();
  });
});
