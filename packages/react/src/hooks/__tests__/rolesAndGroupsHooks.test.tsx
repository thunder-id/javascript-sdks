// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, renderHook, waitFor} from '@testing-library/react';
import {createResourceInvalidator, ApiFetcher} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import {afterEach, describe, expect, it, vi, type Mock} from 'vitest';
import ThunderIDContext, {ThunderIDContextProps} from '../../contexts/ThunderID/ThunderIDContext';
import useGetAgentRoles from '../agents/useGetAgentRoles';
import useAddGroupMembers from '../groups/useAddGroupMembers';
import useGetGroupMembers from '../groups/useGetGroupMembers';
import useGetGroups from '../groups/useGetGroups';
import useAddRoleAssignments from '../roles/useAddRoleAssignments';
import useGetRoleAssignments from '../roles/useGetRoleAssignments';
import useGetRoles from '../roles/useGetRoles';
import useGetUserGroups from '../users/useGetUserGroups';

type FetcherMock = Mock<ApiFetcher>;

const baseUrl = 'https://localhost:8090';

const createFetcher = (body: unknown = {}): FetcherMock =>
  vi.fn<ApiFetcher>().mockImplementation(() =>
    Promise.resolve({
      json: () => Promise.resolve(body),
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response),
  );

const createWrapper = ({
  fetcher,
  ...overrides
}: Partial<ThunderIDContextProps> & {fetcher?: ApiFetcher} = {}): ((props: {children: ReactNode}) => ReactElement) => {
  const value = {
    baseUrl,
    endpoints: undefined,
    http: {fetcher},
    instanceId: 0,
    invalidator: createResourceInvalidator(),
    ...overrides,
  } as unknown as ThunderIDContextProps;

  function Wrapper({children}: {children: ReactNode}): ReactElement {
    return <ThunderIDContext.Provider value={value}>{children}</ThunderIDContext.Provider>;
  }

  return Wrapper;
};

const requestedUrls = (fetcher: FetcherMock): string[] => fetcher.mock.calls.map(([url]: [string, RequestInit]) => url);

afterEach(() => {
  cleanup();
});

describe('role and group query hooks', () => {
  it('loads roles and groups from their collections', async () => {
    const fetcher: FetcherMock = createFetcher({count: 0, groups: [], roles: [], startIndex: 1, totalResults: 0});

    const {result} = renderHook(() => ({groups: useGetGroups({limit: 10}), roles: useGetRoles({limit: 10})}), {
      wrapper: createWrapper({fetcher}),
    });

    await waitFor(() => expect(result.current.roles.isLoading).toBe(false));
    await waitFor(() => expect(result.current.groups.isLoading).toBe(false));
    expect(requestedUrls(fetcher)).toEqual(
      expect.arrayContaining([`${baseUrl}/roles?limit=10`, `${baseUrl}/groups?include=display&limit=10`]),
    );
  });

  it('targets the groups endpoints override when the provider sets one', async () => {
    const fetcher: FetcherMock = createFetcher({count: 0, members: [], startIndex: 1, totalResults: 0});

    const {result} = renderHook(() => useGetGroupMembers('g-1'), {
      wrapper: createWrapper({endpoints: {groups: 'https://rs.example.com/groups'}, fetcher}),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher.mock.calls[0][0]).toBe('https://rs.example.com/groups/g-1/members?include=display');
  });

  it('waits for an identifier before fetching sub-resources', () => {
    const fetcher: FetcherMock = createFetcher();

    const {result} = renderHook(
      () => ({assignments: useGetRoleAssignments(undefined), memberships: useGetUserGroups(undefined)}),
      {wrapper: createWrapper({fetcher})},
    );

    expect(result.current.assignments.isLoading).toBe(false);
    expect(result.current.memberships.isLoading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('role and group mutation hooks', () => {
  it('refetches assignment lists and agent roles after assigning a role', async () => {
    const fetcher: FetcherMock = createFetcher({assignments: [], count: 0, roles: [], startIndex: 1, totalResults: 0});

    const {result} = renderHook(
      () => ({
        add: useAddRoleAssignments(),
        agentRoles: useGetAgentRoles('ag-1'),
        assignments: useGetRoleAssignments('r-1'),
      }),
      {wrapper: createWrapper({fetcher})},
    );

    await waitFor(() => expect(result.current.assignments.isLoading).toBe(false));
    await waitFor(() => expect(result.current.agentRoles.isLoading).toBe(false));
    fetcher.mockClear();

    await act(async () => {
      await result.current.add.mutate({assignments: [{id: 'ag-1', type: 'agent'}], roleId: 'r-1'});
    });

    const urls: string[] = requestedUrls(fetcher);
    expect(urls).toContain(`${baseUrl}/roles/r-1/assignments/add`);
    await waitFor(() => expect(requestedUrls(fetcher)).toContain(`${baseUrl}/roles/r-1/assignments?include=display`));
    await waitFor(() => expect(requestedUrls(fetcher)).toContain(`${baseUrl}/agents/ag-1/roles`));
  });

  it('refetches members, memberships and inherited roles after adding group members', async () => {
    const fetcher: FetcherMock = createFetcher({
      assignments: [],
      count: 0,
      groups: [],
      id: 'g-1',
      members: [],
      startIndex: 1,
      totalResults: 0,
    });

    const {result} = renderHook(
      () => ({
        add: useAddGroupMembers(),
        assignments: useGetRoleAssignments('r-1'),
        members: useGetGroupMembers('g-1'),
        memberships: useGetUserGroups('u-1'),
      }),
      {wrapper: createWrapper({fetcher})},
    );

    await waitFor(() => expect(result.current.members.isLoading).toBe(false));
    await waitFor(() => expect(result.current.memberships.isLoading).toBe(false));
    await waitFor(() => expect(result.current.assignments.isLoading).toBe(false));
    fetcher.mockClear();

    await act(async () => {
      await result.current.add.mutate({groupId: 'g-1', members: [{id: 'u-1', type: 'user'}]});
    });

    await waitFor(() =>
      expect(requestedUrls(fetcher)).toEqual(
        expect.arrayContaining([
          `${baseUrl}/groups/g-1/members/add`,
          `${baseUrl}/groups/g-1/members?include=display`,
          `${baseUrl}/users/u-1/groups`,
          `${baseUrl}/roles/r-1/assignments?include=display`,
        ]),
      ),
    );
  });
});
