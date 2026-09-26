// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, it, expect, vi, type Mock} from 'vitest';
import {ApiFetcher} from '../../models/api';
import createAgent from '../agents/createAgent';
import deleteAgent from '../agents/deleteAgent';
import getAgent from '../agents/getAgent';
import getAgents from '../agents/getAgents';
import updateAgent from '../agents/updateAgent';
import createApplication from '../applications/createApplication';
import deleteApplication from '../applications/deleteApplication';
import getApplication from '../applications/getApplication';
import getApplications from '../applications/getApplications';
import updateApplication from '../applications/updateApplication';
import createUser from '../users/createUser';
import deleteUser from '../users/deleteUser';
import getUser from '../users/getUser';
import getUsers from '../users/getUsers';
import updateUser from '../users/updateUser';

type FetcherMock = Mock<ApiFetcher>;
type Run = (fetcher: ApiFetcher) => Promise<unknown>;

interface SentRequest {
  body: BodyInit | null | undefined;
  method: string | undefined;
  url: string;
}

const baseUrl = 'https://localhost:8090';
const payload = {name: 'Resource', ouId: 'ou-1', type: 'default'};

const createFetcher = (body: unknown = {}): FetcherMock =>
  vi.fn<ApiFetcher>().mockResolvedValue({
    json: () => Promise.resolve(body),
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

const sentRequest = (fetcher: FetcherMock): SentRequest => {
  const [url, init] = fetcher.mock.calls[0];

  return {body: init.body, method: init.method, url};
};

describe('management API', () => {
  it.each<[string, Run, string, string]>([
    [
      'getApplications',
      (fetcher: ApiFetcher) => getApplications({baseUrl, fetcher, limit: 5, offset: 10}),
      'GET',
      `${baseUrl}/applications?limit=5&offset=10`,
    ],
    [
      'getApplication',
      (fetcher: ApiFetcher) => getApplication({applicationId: 'app-1', baseUrl, fetcher}),
      'GET',
      `${baseUrl}/applications/app-1`,
    ],
    [
      'deleteApplication',
      (fetcher: ApiFetcher) => deleteApplication({applicationId: 'app-1', baseUrl, fetcher}),
      'DELETE',
      `${baseUrl}/applications/app-1`,
    ],
    [
      'getUsers',
      (fetcher: ApiFetcher) => getUsers({baseUrl, fetcher, filter: 'username eq "a"', limit: 5}),
      'GET',
      `${baseUrl}/users?filter=username+eq+%22a%22&include=display&limit=5`,
    ],
    [
      'getUser',
      (fetcher: ApiFetcher) => getUser({baseUrl, fetcher, userId: 'u-1'}),
      'GET',
      `${baseUrl}/users/u-1?include=display`,
    ],
    [
      'deleteUser',
      (fetcher: ApiFetcher) => deleteUser({baseUrl, fetcher, userId: 'u-1'}),
      'DELETE',
      `${baseUrl}/users/u-1`,
    ],
    ['getAgents', (fetcher: ApiFetcher) => getAgents({baseUrl, fetcher}), 'GET', `${baseUrl}/agents?include=display`],
    [
      'getAgent',
      (fetcher: ApiFetcher) => getAgent({agentId: 'ag-1', baseUrl, fetcher}),
      'GET',
      `${baseUrl}/agents/ag-1?include=display`,
    ],
    [
      'deleteAgent',
      (fetcher: ApiFetcher) => deleteAgent({agentId: 'ag-1', baseUrl, fetcher}),
      'DELETE',
      `${baseUrl}/agents/ag-1`,
    ],
  ])('%s sends the expected request', async (_name: string, run: Run, method: string, url: string) => {
    const fetcher: FetcherMock = createFetcher();

    await run(fetcher);

    expect(sentRequest(fetcher)).toEqual({body: undefined, method, url});
  });

  it.each<[string, Run, string, string]>([
    [
      'createApplication',
      (fetcher: ApiFetcher) => createApplication({baseUrl, fetcher, payload}),
      'POST',
      `${baseUrl}/applications`,
    ],
    [
      'updateApplication',
      (fetcher: ApiFetcher) => updateApplication({applicationId: 'app-1', baseUrl, fetcher, payload}),
      'PUT',
      `${baseUrl}/applications/app-1`,
    ],
    ['createUser', (fetcher: ApiFetcher) => createUser({baseUrl, fetcher, payload}), 'POST', `${baseUrl}/users`],
    [
      'updateUser',
      (fetcher: ApiFetcher) => updateUser({baseUrl, fetcher, payload, userId: 'u-1'}),
      'PUT',
      `${baseUrl}/users/u-1`,
    ],
    ['createAgent', (fetcher: ApiFetcher) => createAgent({baseUrl, fetcher, payload}), 'POST', `${baseUrl}/agents`],
    [
      'updateAgent',
      (fetcher: ApiFetcher) => updateAgent({agentId: 'ag-1', baseUrl, fetcher, payload}),
      'PUT',
      `${baseUrl}/agents/ag-1`,
    ],
  ])(
    '%s sends the payload and returns the stored resource',
    async (_name: string, run: Run, method: string, url: string) => {
      const stored: Record<string, string> = {id: 'new-id', name: 'Resource'};
      const fetcher: FetcherMock = createFetcher(stored);

      const result: unknown = await run(fetcher);

      expect(result).toEqual(stored);
      expect(sentRequest(fetcher)).toEqual({body: JSON.stringify(payload), method, url});
    },
  );

  it('prefixes error codes with the operation name', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('missing'),
    } as Response);

    await expect(getApplication({applicationId: 'x', baseUrl, fetcher})).rejects.toMatchObject({
      code: 'getApplication-NotFoundError-001',
    });
  });
});
