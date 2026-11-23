// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi, type Mock} from 'vitest';
import ThunderIDAPIError from '../../../errors/ThunderIDAPIError';
import {ApiFetcher} from '../../../models/api';
import deleteMeAgent from '../deleteMeAgent';
import getMeAgent from '../getMeAgent';
import getMeAgents from '../getMeAgents';
import suspendAllMeAgents from '../suspendAllMeAgents';
import suspendMeAgent from '../suspendMeAgent';
import unsuspendMeAgent from '../unsuspendMeAgent';
import updateMeAgent from '../updateMeAgent';

type FetcherMock = Mock<ApiFetcher>;
type Run = (fetcher: ApiFetcher) => Promise<unknown>;

const baseUrl = 'https://localhost:8090';
const agentId = 'agent-1';
const payload = {
  attributes: {name: 'Spending assistant'},
  grantTypes: ['authorization_code'],
  redirectUris: ['https://assistant.example.com/callback'],
};

const respond = (status: number, body: unknown = {}): FetcherMock =>
  vi.fn<ApiFetcher>().mockResolvedValue({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

describe('personal agent self-service API', () => {
  it.each<[string, Run, string, string, unknown]>([
    [
      'getMeAgents',
      (fetcher: ApiFetcher) => getMeAgents({baseUrl, fetcher, kind: 'personal-assistant', limit: 5, offset: 10}),
      'GET',
      `${baseUrl}/users/me/agents?kind=personal-assistant&limit=5&offset=10`,
      undefined,
    ],
    [
      'getMeAgent',
      (fetcher: ApiFetcher) => getMeAgent({agentId, baseUrl, fetcher}),
      'GET',
      `${baseUrl}/users/me/agents/agent-1?include=display`,
      undefined,
    ],
    [
      'updateMeAgent',
      (fetcher: ApiFetcher) => updateMeAgent({agentId, baseUrl, fetcher, payload}),
      'PUT',
      `${baseUrl}/users/me/agents/agent-1`,
      JSON.stringify(payload),
    ],
    [
      'deleteMeAgent',
      (fetcher: ApiFetcher) => deleteMeAgent({agentId, baseUrl, fetcher}),
      'DELETE',
      `${baseUrl}/users/me/agents/agent-1`,
      undefined,
    ],
    [
      'suspendMeAgent',
      (fetcher: ApiFetcher) => suspendMeAgent({agentId, baseUrl, fetcher}),
      'POST',
      `${baseUrl}/users/me/agents/agent-1/suspend`,
      undefined,
    ],
    [
      'unsuspendMeAgent',
      (fetcher: ApiFetcher) => unsuspendMeAgent({agentId, baseUrl, fetcher}),
      'POST',
      `${baseUrl}/users/me/agents/agent-1/unsuspend`,
      undefined,
    ],
    [
      'suspendAllMeAgents',
      (fetcher: ApiFetcher) => suspendAllMeAgents({baseUrl, fetcher}),
      'POST',
      `${baseUrl}/users/me/agents/suspend`,
      undefined,
    ],
  ])('%s sends %s to the self-service route', async (_name, run, method, url, body) => {
    const fetcher: FetcherMock = respond(200);

    await run(fetcher);

    const [sentUrl, init] = fetcher.mock.calls[0];
    expect(sentUrl).toBe(url);
    expect(init.method).toBe(method);
    expect(init.body).toBe(body);
  });

  it('lists every agent the user owns when no kind is given', async () => {
    const fetcher: FetcherMock = respond(200, {agents: [], count: 0, startIndex: 1, totalResults: 0});

    await getMeAgents({baseUrl, fetcher});

    expect(fetcher.mock.calls[0][0]).toBe(`${baseUrl}/users/me/agents`);
  });

  it('honors the collection URL override, including for suspending every agent', async () => {
    const url = 'https://rs.example.com/users/me/agents/';
    const single: FetcherMock = respond(204);
    const all: FetcherMock = respond(200, {suspendedCount: 2});

    await suspendMeAgent({agentId, fetcher: single, url});
    const result: unknown = await suspendAllMeAgents({fetcher: all, url});

    expect(single.mock.calls[0][0]).toBe('https://rs.example.com/users/me/agents/agent-1/suspend');
    expect(all.mock.calls[0][0]).toBe('https://rs.example.com/users/me/agents/suspend');
    expect(result).toEqual({suspendedCount: 2});
  });

  it('resolves with nothing when the server answers 204', async () => {
    await expect(unsuspendMeAgent({agentId, baseUrl, fetcher: respond(204)})).resolves.toBeUndefined();
  });

  it.each<[number, string]>([
    [403, 'getMeAgent-ForbiddenError-001'],
    [404, 'getMeAgent-NotFoundError-001'],
    [500, 'getMeAgent-ResponseError-001'],
  ])('raises a distinct code for HTTP %i', async (status, code) => {
    const error: unknown = await getMeAgent({agentId, baseUrl, fetcher: respond(status, {code: 'AGT-1004'})}).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ThunderIDAPIError);
    expect((error as ThunderIDAPIError).code).toBe(code);
  });

  it.each<[string, (fetcher: ApiFetcher, id: string) => Promise<unknown>]>([
    ['getMeAgent', (fetcher: ApiFetcher, id: string) => getMeAgent({agentId: id, baseUrl, fetcher})],
    ['updateMeAgent', (fetcher: ApiFetcher, id: string) => updateMeAgent({agentId: id, baseUrl, fetcher, payload})],
    ['deleteMeAgent', (fetcher: ApiFetcher, id: string) => deleteMeAgent({agentId: id, baseUrl, fetcher})],
    ['suspendMeAgent', (fetcher: ApiFetcher, id: string) => suspendMeAgent({agentId: id, baseUrl, fetcher})],
    ['unsuspendMeAgent', (fetcher: ApiFetcher, id: string) => unsuspendMeAgent({agentId: id, baseUrl, fetcher})],
  ])('%s refuses a blank or whitespace-only agent ID before any request', async (operation, run) => {
    for (const id of ['', ' ', ' \t\n']) {
      const fetcher: FetcherMock = respond(200);

      await expect(run(fetcher, id)).rejects.toMatchObject({code: `${operation}-ValidationError-002`});
      expect(fetcher).not.toHaveBeenCalled();
    }
  });

  it('sends empty grant types and redirect URIs, which remove them', async () => {
    const fetcher: FetcherMock = respond(200, {id: agentId});

    await updateMeAgent({
      agentId,
      baseUrl,
      fetcher,
      payload: {attributes: {name: 'Spending assistant'}, grantTypes: [], redirectUris: []},
    });

    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({
      attributes: {name: 'Spending assistant'},
      grantTypes: [],
      redirectUris: [],
    });
  });
});
