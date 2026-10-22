// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, it, expect, vi, type Mock} from 'vitest';
import {ApiFetcher} from '../../models/api';
import getAgentGroups from '../agents/getAgentGroups';
import getAgentRoles from '../agents/getAgentRoles';
import getAgentTypes from '../agents/getAgentTypes';
import addGroupMembers from '../groups/addGroupMembers';
import createGroup from '../groups/createGroup';
import deleteGroup from '../groups/deleteGroup';
import getGroup from '../groups/getGroup';
import getGroupMembers from '../groups/getGroupMembers';
import getGroups from '../groups/getGroups';
import removeGroupMembers from '../groups/removeGroupMembers';
import updateGroup from '../groups/updateGroup';
import addRoleAssignments from '../roles/addRoleAssignments';
import createRole from '../roles/createRole';
import deleteRole from '../roles/deleteRole';
import getRole from '../roles/getRole';
import getRoleAssignments from '../roles/getRoleAssignments';
import getRoles from '../roles/getRoles';
import removeRoleAssignments from '../roles/removeRoleAssignments';
import updateRole from '../roles/updateRole';
import getUserGroups from '../users/getUserGroups';

type FetcherMock = Mock<ApiFetcher>;
type Run = (fetcher: ApiFetcher) => Promise<unknown>;

interface SentRequest {
  body: BodyInit | null | undefined;
  method: string | undefined;
  url: string;
}

const baseUrl = 'https://localhost:8090';

const createFetcher = (body: unknown = {}, status = 200): FetcherMock =>
  vi.fn<ApiFetcher>().mockResolvedValue({
    json: () => Promise.resolve(body),
    ok: true,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

const sentRequest = (fetcher: FetcherMock): SentRequest => {
  const [url, init] = fetcher.mock.calls[0];

  return {body: init.body, method: init.method, url};
};

describe('roles and groups management API', () => {
  it.each<[string, Run, string, string]>([
    ['getRoles', (fetcher: ApiFetcher) => getRoles({baseUrl, fetcher, limit: 5}), 'GET', `${baseUrl}/roles?limit=5`],
    ['getRole', (fetcher: ApiFetcher) => getRole({baseUrl, fetcher, roleId: 'r-1'}), 'GET', `${baseUrl}/roles/r-1`],
    [
      'deleteRole',
      (fetcher: ApiFetcher) => deleteRole({baseUrl, fetcher, roleId: 'r-1'}),
      'DELETE',
      `${baseUrl}/roles/r-1`,
    ],
    [
      'getRoleAssignments',
      (fetcher: ApiFetcher) => getRoleAssignments({baseUrl, fetcher, roleId: 'r-1', type: 'group'}),
      'GET',
      `${baseUrl}/roles/r-1/assignments?include=display&type=group`,
    ],
    [
      'getGroups',
      (fetcher: ApiFetcher) => getGroups({baseUrl, fetcher, offset: 10}),
      'GET',
      `${baseUrl}/groups?include=display&offset=10`,
    ],
    [
      'getGroup',
      (fetcher: ApiFetcher) => getGroup({baseUrl, fetcher, groupId: 'g-1'}),
      'GET',
      `${baseUrl}/groups/g-1?include=display`,
    ],
    [
      'deleteGroup',
      (fetcher: ApiFetcher) => deleteGroup({baseUrl, fetcher, groupId: 'g-1'}),
      'DELETE',
      `${baseUrl}/groups/g-1`,
    ],
    [
      'getGroupMembers',
      (fetcher: ApiFetcher) => getGroupMembers({baseUrl, fetcher, groupId: 'g-1', limit: 20}),
      'GET',
      `${baseUrl}/groups/g-1/members?include=display&limit=20`,
    ],
    [
      'getUserGroups',
      (fetcher: ApiFetcher) => getUserGroups({baseUrl, fetcher, userId: 'u-1'}),
      'GET',
      `${baseUrl}/users/u-1/groups`,
    ],
    [
      'getAgentGroups',
      (fetcher: ApiFetcher) => getAgentGroups({agentId: 'ag-1', baseUrl, fetcher}),
      'GET',
      `${baseUrl}/agents/ag-1/groups`,
    ],
    [
      'getAgentRoles',
      (fetcher: ApiFetcher) => getAgentRoles({agentId: 'ag-1', baseUrl, fetcher}),
      'GET',
      `${baseUrl}/agents/ag-1/roles`,
    ],
    [
      'getAgentTypes',
      (fetcher: ApiFetcher) => getAgentTypes({baseUrl, fetcher, limit: 50}),
      'GET',
      `${baseUrl}/agent-types?limit=50`,
    ],
  ])('%s sends the expected request', async (_name: string, run: Run, method: string, url: string) => {
    const fetcher: FetcherMock = createFetcher();

    await run(fetcher);

    expect(sentRequest(fetcher)).toEqual({body: undefined, method, url});
  });

  it.each<[string, Run, string, string, unknown]>([
    [
      'createRole',
      (fetcher: ApiFetcher) => createRole({baseUrl, fetcher, payload: {name: 'Developer', ouId: 'ou-1'}}),
      'POST',
      `${baseUrl}/roles`,
      {name: 'Developer', ouId: 'ou-1'},
    ],
    [
      'updateRole',
      (fetcher: ApiFetcher) =>
        updateRole({baseUrl, fetcher, payload: {name: 'Developer', ouId: 'ou-1', permissions: []}, roleId: 'r-1'}),
      'PUT',
      `${baseUrl}/roles/r-1`,
      {name: 'Developer', ouId: 'ou-1', permissions: []},
    ],
    [
      'createGroup',
      (fetcher: ApiFetcher) => createGroup({baseUrl, fetcher, payload: {name: 'Platform', ouId: 'ou-1'}}),
      'POST',
      `${baseUrl}/groups`,
      {name: 'Platform', ouId: 'ou-1'},
    ],
    [
      'updateGroup',
      (fetcher: ApiFetcher) =>
        updateGroup({baseUrl, fetcher, groupId: 'g-1', payload: {name: 'Platform', ouId: 'ou-1'}}),
      'PUT',
      `${baseUrl}/groups/g-1`,
      {name: 'Platform', ouId: 'ou-1'},
    ],
    [
      'addGroupMembers',
      (fetcher: ApiFetcher) =>
        addGroupMembers({baseUrl, fetcher, groupId: 'g-1', members: [{id: 'u-1', type: 'user'}]}),
      'POST',
      `${baseUrl}/groups/g-1/members/add`,
      {members: [{id: 'u-1', type: 'user'}]},
    ],
    [
      'removeGroupMembers',
      (fetcher: ApiFetcher) =>
        removeGroupMembers({baseUrl, fetcher, groupId: 'g-1', members: [{id: 'ag-1', type: 'agent'}]}),
      'POST',
      `${baseUrl}/groups/g-1/members/remove`,
      {members: [{id: 'ag-1', type: 'agent'}]},
    ],
  ])(
    '%s sends the payload and returns the stored resource',
    async (_name: string, run: Run, method: string, url: string, body: unknown) => {
      const stored: Record<string, string> = {id: 'new-id', name: 'Resource'};
      const fetcher: FetcherMock = createFetcher(stored);

      const result: unknown = await run(fetcher);

      expect(result).toEqual(stored);
      expect(sentRequest(fetcher)).toEqual({body: JSON.stringify(body), method, url});
    },
  );

  it.each<[string, Run, string]>([
    [
      'addRoleAssignments',
      (fetcher: ApiFetcher) =>
        addRoleAssignments({assignments: [{id: 'g-1', type: 'group'}], baseUrl, fetcher, roleId: 'r-1'}),
      `${baseUrl}/roles/r-1/assignments/add`,
    ],
    [
      'removeRoleAssignments',
      (fetcher: ApiFetcher) =>
        removeRoleAssignments({assignments: [{id: 'g-1', type: 'group'}], baseUrl, fetcher, roleId: 'r-1'}),
      `${baseUrl}/roles/r-1/assignments/remove`,
    ],
  ])('%s posts the assignments and resolves without a body', async (_name: string, run: Run, url: string) => {
    const fetcher: FetcherMock = createFetcher(undefined, 204);

    const result: unknown = await run(fetcher);

    expect(result).toBeUndefined();
    expect(sentRequest(fetcher)).toEqual({
      body: JSON.stringify({assignments: [{id: 'g-1', type: 'group'}]}),
      method: 'POST',
      url,
    });
  });

  it('appends the sub-resource path to a collection URL override', async () => {
    const fetcher: FetcherMock = createFetcher();

    await getGroupMembers({fetcher, groupId: 'g-1', url: 'https://rs.example.com/groups'});

    expect(sentRequest(fetcher).url).toBe('https://rs.example.com/groups/g-1/members?include=display');
  });
});
