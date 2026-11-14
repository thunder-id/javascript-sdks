// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  GroupQueryKeys,
  RoleQueryKeys,
  UserQueryKeys,
  addGroupMembers,
  createGroup,
  deleteRole,
  getGroups,
  getSecret,
  getUser,
  getUsers,
} from '@thunderid/browser';
import type {
  CreateGroupRequest,
  Group,
  GroupListResponse,
  ManagedUser,
  ManagedUserListResponse,
} from '@thunderid/browser';
import {mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {defineComponent, h, nextTick, ref} from 'vue';
import useGrantedPermissions from '../../../composables/management/useGrantedPermissions';
import useManagementEndpoint from '../../../composables/management/useManagementEndpoint';
import useManagementRequestConfig from '../../../composables/management/useManagementRequestConfig';
import useResourceMutation from '../../../composables/management/useResourceMutation';
import useResourceQuery from '../../../composables/management/useResourceQuery';
import {type MockFetcher, createManagementContext, jsonResponse} from '../../helpers/managementContext';

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

interface GroupMembersVariables {
  groupId: string;
  members: {id: string; type: 'user'}[];
}

/** A groups list query, as the connected admin components build one. */
const useGroupsQuery = (params: () => {limit?: number; offset?: number} = () => ({})) => {
  const endpoint = useManagementEndpoint('groups');

  return useResourceQuery<GroupListResponse>(
    () => [GroupQueryKeys.GROUPS, params()],
    (fetcher) => getGroups({...endpoint, fetcher, ...params()}),
  );
};

describe('management query layer (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it('lists users from {baseUrl}/users through the provider fetcher', async () => {
    const context = createManagementContext();
    context.fetcher.mockResolvedValue(jsonResponse({...page, users: [{id: 'u1'}]}));
    const {result} = withSetup(() => {
      const endpoint = useManagementEndpoint('users');
      const params = {filter: 'username sw "a"', limit: 5, offset: 10};

      return useResourceQuery<ManagedUserListResponse>(
        () => [UserQueryKeys.USERS, params],
        (fetcher) => getUsers({...endpoint, fetcher, ...params}),
      );
    }, context);

    await vi.waitFor(() => expect(result.data.value?.users).toHaveLength(1));
    const url = new URL(calledUrls(context.fetcher)[0]);
    expect(url.origin + url.pathname).toBe('https://thunder.example/users');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('offset')).toBe('10');
    expect(url.searchParams.get('filter')).toBe('username sw "a"');
    expect(context.fetcher.mock.calls[0][1]).toMatchObject({method: 'GET'});
  });

  it('honors an endpoints override for groups and refetches when the key changes', async () => {
    const context = createManagementContext({endpoints: {groups: 'https://rs.example/v2/groups'}});
    context.fetcher.mockResolvedValue(jsonResponse({...page, groups: []}));
    const offset = ref(0);
    withSetup(() => useGroupsQuery(() => ({limit: 10, offset: offset.value})), context);

    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(1));
    expect(calledUrls(context.fetcher)[0]).toMatch(/^https:\/\/rs\.example\/v2\/groups\?/);

    offset.value = 10;
    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(2));
    expect(new URL(calledUrls(context.fetcher)[1]).searchParams.get('offset')).toBe('10');
  });

  it('waits until enabled before fetching', async () => {
    const context = createManagementContext();
    context.fetcher.mockResolvedValue(jsonResponse({id: 'u1', ouId: 'ou-1', type: 'person'}));
    const userId = ref<string | undefined>(undefined);
    const {result} = withSetup(() => {
      const endpoint = useManagementEndpoint('users');

      return useResourceQuery<ManagedUser>(
        () => [UserQueryKeys.USER, userId.value],
        (fetcher) => getUser({...endpoint, fetcher, userId: userId.value!}),
        {enabled: () => Boolean(userId.value)},
      );
    }, context);

    await nextTick();
    expect(context.fetcher).not.toHaveBeenCalled();
    expect(result.isLoading.value).toBe(false);

    userId.value = 'u1';
    await vi.waitFor(() => expect(result.data.value?.id).toBe('u1'));
    expect(new URL(calledUrls(context.fetcher)[0]).pathname).toBe('/users/u1');
  });

  it('mutates through POST, invalidates the returned key prefixes and refetches the matching queries', async () => {
    const context = createManagementContext();
    const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
    context.fetcher.mockImplementation((_url: string, init: RequestInit) =>
      Promise.resolve(
        init.method === 'POST'
          ? jsonResponse({id: 'g2', name: 'Ops', ouId: 'ou-1'}, 201)
          : jsonResponse({...page, groups: []}),
      ),
    );
    const onSuccess = vi.fn();
    const {result} = withSetup(() => {
      const endpoint = useManagementEndpoint('groups');

      return {
        create: useResourceMutation<Group, CreateGroupRequest>(
          (payload, fetcher) => createGroup({...endpoint, fetcher, payload}),
          () => [[GroupQueryKeys.GROUPS], [GroupQueryKeys.MEMBERSHIPS]],
          {onSuccess},
        ),
        list: useGroupsQuery(() => ({limit: 10})),
      };
    }, context);
    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(1));

    await result.create.mutate({name: 'Ops', ouId: 'ou-1'});

    expect(context.fetcher.mock.calls[1][0]).toBe('https://thunder.example/groups');
    expect(context.fetcher.mock.calls[1][1]).toMatchObject({method: 'POST'});
    expect(JSON.parse(context.fetcher.mock.calls[1][1].body as string)).toEqual({name: 'Ops', ouId: 'ou-1'});
    expect(invalidate.mock.calls.map((call) => call[0])).toEqual([
      [GroupQueryKeys.GROUPS],
      [GroupQueryKeys.MEMBERSHIPS],
    ]);
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({id: 'g2'}), {name: 'Ops', ouId: 'ou-1'});
    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(3));
  });

  it('passes the mutation variables to the request and to the invalidated keys', async () => {
    const context = createManagementContext();
    const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
    context.fetcher.mockResolvedValue(jsonResponse({id: 'g1', name: 'Ops', ouId: 'ou-1'}));
    const {result} = withSetup(() => {
      const endpoint = useManagementEndpoint('groups');

      return useResourceMutation<Group, GroupMembersVariables>(
        ({groupId, members}, fetcher) => addGroupMembers({...endpoint, fetcher, groupId, members}),
        ({groupId}) => [[GroupQueryKeys.GROUP, groupId]],
      );
    }, context);

    await result.mutateAsync({groupId: 'g1', members: [{id: 'u1', type: 'user'}]});

    expect(context.fetcher.mock.calls[0][0]).toBe('https://thunder.example/groups/g1/members/add');
    expect(context.fetcher.mock.calls[0][1]).toMatchObject({method: 'POST'});
    expect(invalidate).toHaveBeenCalledWith([GroupQueryKeys.GROUP, 'g1']);
  });

  it('uses its own fetcher over the provider one, and reports a 403 as a typed error without invalidating', async () => {
    const context = createManagementContext();
    const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
    const own = vi.fn().mockResolvedValue(jsonResponse({code: 'ROL-1', message: 'nope'}, 403));
    const onError = vi.fn();
    const {result} = withSetup(() => {
      const endpoint = useManagementEndpoint('roles');

      return useResourceMutation(
        (roleId: string, fetcher) => deleteRole({...endpoint, fetcher, roleId}),
        () => [[RoleQueryKeys.ROLES]],
        {fetcher: own, onError},
      );
    }, context);

    await expect(result.mutateAsync('r1')).rejects.toMatchObject({statusCode: 403});
    expect(context.fetcher).not.toHaveBeenCalled();
    expect(own.mock.calls[0][0]).toBe('https://thunder.example/roles/r1');
    expect(result.error.value).toMatchObject({statusCode: 403});
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({statusCode: 403}), 'r1');
    expect(await result.mutate('r1')).toBeUndefined();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('subscribes a query under its key and stops listening once unmounted', async () => {
    const context = createManagementContext();
    const subscribe = vi.spyOn(context.thunderID.invalidator, 'subscribe');
    context.fetcher.mockResolvedValue(jsonResponse({...page, groups: []}));
    withSetup(() => useGroupsQuery(() => ({limit: 10})), context);

    await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(1));
    expect(subscribe.mock.calls[0][0]).toEqual([GroupQueryKeys.GROUPS, {limit: 10}]);

    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
    context.thunderID.invalidator.invalidate([GroupQueryKeys.GROUPS]);
    await nextTick();
    expect(context.fetcher).toHaveBeenCalledTimes(1);
  });

  it('builds a request config with the resolved endpoint and the provider fetcher', async () => {
    const context = createManagementContext({endpoints: {users: 'https://rs.example/v2/users'}});
    context.fetcher.mockResolvedValue(jsonResponse({...page, users: []}));
    const {result} = withSetup(() => useManagementRequestConfig('users'), context);

    expect(result).toMatchObject({baseUrl: 'https://thunder.example', url: 'https://rs.example/v2/users'});
    await getUsers({...result, limit: 1});
    expect(calledUrls(context.fetcher)[0]).toMatch(/^https:\/\/rs\.example\/v2\/users\?/);
  });

  it('addresses the newer management collections through their endpoints overrides', async () => {
    const context = createManagementContext({endpoints: {secrets: 'https://vault.example/secrets'}});
    context.fetcher.mockResolvedValue(jsonResponse({}));
    const {result} = withSetup(() => useManagementRequestConfig('secrets'), context);

    await getSecret({...result, name: 'SMTP_PASSWORD'});
    expect(calledUrls(context.fetcher)[0]).toBe('https://vault.example/secrets/SMTP_PASSWORD');
  });
});

describe('useGrantedPermissions (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it('reads the granted permissions from the client and checks them by prefix', async () => {
    const context = createManagementContext({grantedPermissions: ['openid', 'system:user', 'system:group:view']});
    const {result} = withSetup(() => useGrantedPermissions(), context);

    expect(result.isLoading.value).toBe(true);
    await vi.waitFor(() => expect(result.isLoading.value).toBe(false));
    expect(result.can('system:user:view')).toBe(true);
    expect(result.can('system:group:view')).toBe(true);
    expect(result.can('system:role:view')).toBe(false);
  });

  it('matches by the resource server passed to can', async () => {
    const context = createManagementContext({grantedPermissions: ['orders']});
    const {result} = withSetup(() => useGrantedPermissions(), context);

    await vi.waitFor(() => expect(result.isLoading.value).toBe(false));
    expect(result.can('orders:create')).toBe(true);
    expect(result.can('orders:create', {hierarchical: false})).toBe(false);
    expect(result.can('orders.create', {delimiter: '.'})).toBe(true);
  });

  it('grants nothing while signed out', async () => {
    const context = createManagementContext({isSignedIn: false});
    const {result} = withSetup(() => useGrantedPermissions(), context);

    await nextTick();
    expect(result.isLoading.value).toBe(false);
    expect(result.permissions.value).toEqual([]);
    expect(context.thunderID.getGrantedPermissions).not.toHaveBeenCalled();
  });
});
