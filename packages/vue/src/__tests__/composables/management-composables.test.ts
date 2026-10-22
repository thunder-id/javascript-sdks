// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {defineComponent, h, nextTick, ref} from 'vue';
import useGetAgentRoles from '../../composables/agents/useGetAgentRoles';
import useGetAgentTypes from '../../composables/agents/useGetAgentTypes';
import useAddGroupMembers from '../../composables/groups/useAddGroupMembers';
import useCreateGroup from '../../composables/groups/useCreateGroup';
import useGetGroupMembers from '../../composables/groups/useGetGroupMembers';
import useGetGroups from '../../composables/groups/useGetGroups';
import useDeleteRole from '../../composables/roles/useDeleteRole';
import useGetRoleAssignments from '../../composables/roles/useGetRoleAssignments';
import useGrantedPermissions from '../../composables/useGrantedPermissions';
import useGetUser from '../../composables/users/useGetUser';
import useGetUserGroups from '../../composables/users/useGetUserGroups';
import useGetUsers from '../../composables/users/useGetUsers';
import {type MockFetcher, createManagementContext, jsonResponse} from '../helpers/managementContext';

const mounted: {unmount: () => void}[] = [];

/** Runs `setup` inside a mounted component with the management contexts provided. */
const withSetup = <T>(setup: () => T, context = createManagementContext()): {context: typeof context; result: T} => {
  let result!: T;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup();

        return () => h('div');
      },
    }),
    {global: {provide: context.provide}},
  );
  mounted.push(wrapper);

  return {context, result};
};

const calledUrls = (fetcher: MockFetcher): string[] => fetcher.mock.calls.map((call) => call[0]);

const page = {count: 0, startIndex: 1, totalResults: 0};

describe('management composables (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it('lists users from {baseUrl}/users through the provider fetcher', async () => {
    const context = createManagementContext();
    context.fetcher.mockResolvedValue(jsonResponse({...page, users: [{id: 'u1'}]}));
    const {result} = withSetup(() => useGetUsers({filter: 'username sw "a"', limit: 5, offset: 10}), context);

    await vi.waitFor(() => expect(result.data.value?.users).toHaveLength(1));
    const url = new URL(calledUrls(context.fetcher)[0]);
    expect(url.origin + url.pathname).toBe('https://thunder.example/users');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('offset')).toBe('10');
    expect(url.searchParams.get('filter')).toBe('username sw "a"');
    expect(context.fetcher.mock.calls[0][1]).toMatchObject({method: 'GET'});
  });

  it('honors an endpoints override for groups and refetches when the page changes', async () => {
    const context = createManagementContext({endpoints: {groups: 'https://rs.example/v2/groups'}});
    context.fetcher.mockResolvedValue(jsonResponse({...page, groups: []}));
    const offset = ref(0);
    withSetup(() => useGetGroups(() => ({limit: 10, offset: offset.value})), context);

    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(1));
    expect(calledUrls(context.fetcher)[0]).toMatch(/^https:\/\/rs\.example\/v2\/groups\?/);

    offset.value = 10;
    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(2));
    expect(new URL(calledUrls(context.fetcher)[1]).searchParams.get('offset')).toBe('10');
  });

  it('waits for an identifier before fetching a single resource', async () => {
    const context = createManagementContext();
    context.fetcher.mockResolvedValue(jsonResponse({id: 'u1', ouId: 'ou-1', type: 'person'}));
    const userId = ref<string | undefined>(undefined);
    const {result} = withSetup(() => useGetUser(userId), context);

    await nextTick();
    expect(context.fetcher).not.toHaveBeenCalled();
    expect(result.isLoading.value).toBe(false);

    userId.value = 'u1';
    await vi.waitFor(() => expect(result.data.value?.id).toBe('u1'));
    expect(new URL(calledUrls(context.fetcher)[0]).pathname).toBe('/users/u1');
  });

  it('addresses the sub-resources of users, groups, roles and agents', async () => {
    const context = createManagementContext();
    context.fetcher.mockImplementation((url: string) =>
      Promise.resolve(
        jsonResponse({...page, assignments: [], groups: [], members: [], roles: [], types: []}, url ? 200 : 500),
      ),
    );
    withSetup(() => {
      useGetUserGroups('u1', {limit: 100});
      useGetGroupMembers('g1');
      useGetRoleAssignments('r1', {type: 'agent'});
      useGetAgentRoles('a1');
      useGetAgentTypes();
    }, context);

    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(5));
    const paths = calledUrls(context.fetcher).map((url) => {
      const parsed = new URL(url);

      return `${parsed.pathname}${parsed.searchParams.get('type') ? `?type=${parsed.searchParams.get('type')}` : ''}`;
    });
    expect(paths).toEqual(
      expect.arrayContaining([
        '/users/u1/groups',
        '/groups/g1/members',
        '/roles/r1/assignments?type=agent',
        '/agents/a1/roles',
        '/agent-types',
      ]),
    );
  });

  it('creates through POST and refetches the matching mounted lists', async () => {
    const context = createManagementContext();
    context.fetcher.mockImplementation((_url: string, init: RequestInit) =>
      Promise.resolve(
        init.method === 'POST'
          ? jsonResponse({id: 'g2', name: 'Ops', ouId: 'ou-1'}, 201)
          : jsonResponse({...page, groups: []}),
      ),
    );
    const onSuccess = vi.fn();
    const {result} = withSetup(() => ({create: useCreateGroup({onSuccess}), list: useGetGroups()}), context);
    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(1));

    await result.create.mutate({name: 'Ops', ouId: 'ou-1'});

    expect(context.fetcher.mock.calls[1][0]).toBe('https://thunder.example/groups');
    expect(context.fetcher.mock.calls[1][1]).toMatchObject({method: 'POST'});
    expect(JSON.parse(context.fetcher.mock.calls[1][1].body as string)).toEqual({name: 'Ops', ouId: 'ou-1'});
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({id: 'g2'}), {name: 'Ops', ouId: 'ou-1'});
    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(3));
  });

  it('adds group members through the members/add sub-resource', async () => {
    const context = createManagementContext();
    context.fetcher.mockResolvedValue(jsonResponse({id: 'g1', name: 'Ops', ouId: 'ou-1'}));
    const {result} = withSetup(() => useAddGroupMembers(), context);

    await result.mutateAsync({groupId: 'g1', members: [{id: 'u1', type: 'user'}]});

    expect(context.fetcher.mock.calls[0][0]).toBe('https://thunder.example/groups/g1/members/add');
    expect(context.fetcher.mock.calls[0][1]).toMatchObject({method: 'POST'});
  });

  it('uses a per-composable fetcher over the provider one, and reports a 403 as a typed error', async () => {
    const context = createManagementContext();
    const own = vi.fn().mockResolvedValue(jsonResponse({code: 'ROL-1', message: 'nope'}, 403));
    const {result} = withSetup(() => useDeleteRole({fetcher: own}), context);

    await expect(result.mutateAsync('r1')).rejects.toMatchObject({statusCode: 403});
    expect(context.fetcher).not.toHaveBeenCalled();
    expect(own.mock.calls[0][0]).toBe('https://thunder.example/roles/r1');
    expect(result.error.value).toMatchObject({statusCode: 403});
    expect(await result.mutate('r1')).toBeUndefined();
  });
});

describe('useGrantedPermissions (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  const tokenWithScopes = (scope: string): string => {
    const encode = (value: object): string =>
      btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${encode({alg: 'none'})}.${encode({scope, sub: 'u1'})}.signature`;
  };

  it('reads the permissions from the access token and checks them by prefix', async () => {
    const context = createManagementContext({accessToken: tokenWithScopes('openid system:user system:group:view')});
    const {result} = withSetup(() => useGrantedPermissions(), context);

    expect(result.isLoading.value).toBe(true);
    await vi.waitFor(() => expect(result.isLoading.value).toBe(false));
    expect(result.can('system:user:view')).toBe(true);
    expect(result.can('system:group:view')).toBe(true);
    expect(result.can('system:role:view')).toBe(false);
  });

  it('grants nothing while signed out', async () => {
    const context = createManagementContext({isSignedIn: false});
    const {result} = withSetup(() => useGrantedPermissions(), context);

    await nextTick();
    expect(result.isLoading.value).toBe(false);
    expect(result.permissions.value).toEqual([]);
    expect(context.thunderID.getAccessToken).not.toHaveBeenCalled();
  });
});
