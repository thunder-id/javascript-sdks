// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type VueWrapper, mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {h, nextTick} from 'vue';
import RoleDetails from '../../../components/management/RoleDetails/RoleDetails';
import BaseRolePermissions, {
  type BaseRolePermissionsRenderProps,
} from '../../../components/management/RolePermissions/BaseRolePermissions';
import RolePermissions from '../../../components/management/RolePermissions/RolePermissions';
import {type MockFetcher, createManagementContext, jsonResponse, translate} from '../../helpers/managementContext';
import {chooseOption, findAllSelectControls} from '../../helpers/selectControl';

const mounted: VueWrapper[] = [];

const mountWith = (component: unknown, props: Record<string, unknown>, fetcher?: MockFetcher, slots = {}) => {
  const context = createManagementContext(fetcher ? {fetcher} : {});
  const wrapper: VueWrapper = mount(component as never, {
    attachTo: document.body,
    global: {provide: context.provide},
    props,
    slots,
  });
  mounted.push(wrapper);

  return {context, wrapper};
};

const role = {
  id: 'r1',
  name: 'Support',
  ouId: 'ou-1',
  permissions: [{permissions: ['orders:read'], resourceServerId: 'rs-1'}],
};

/** A server with one role, one resource server and its actions. Records every role update. */
const createServer = (current: Record<string, unknown> = role): {fetcher: MockFetcher; updates: unknown[]} => {
  const updates: unknown[] = [];
  let stored: Record<string, unknown> = current;
  const fetcher: MockFetcher = vi.fn((url: string, init: RequestInit) => {
    const {pathname} = new URL(url);

    if (pathname === '/roles/r1' && init?.method === 'PUT') {
      const body: Record<string, unknown> = JSON.parse(init.body as string) as Record<string, unknown>;
      updates.push(body);
      stored = {...stored, ...body};

      return Promise.resolve(jsonResponse(stored));
    }
    if (pathname === '/roles/r1') {
      return Promise.resolve(jsonResponse(stored));
    }
    if (pathname === '/resource-servers') {
      return Promise.resolve(jsonResponse({resourceServers: [{id: 'rs-1', name: 'Orders API'}]}));
    }
    if (pathname === '/resource-servers/rs-1/actions') {
      return Promise.resolve(
        jsonResponse({
          actions: [
            {handle: 'read', id: 'a-1', name: 'Read', permission: 'orders:read'},
            {handle: 'write', id: 'a-2', name: 'Write', permission: 'orders:write'},
          ],
        }),
      );
    }
    if (pathname === '/resource-servers/rs-1/resources') {
      return Promise.resolve(jsonResponse({resources: []}));
    }
    if (pathname.startsWith('/roles/r1/assignments') || ['/users', '/groups', '/agents'].includes(pathname)) {
      return Promise.resolve(jsonResponse({agents: [], assignments: [], groups: [], users: []}));
    }

    return Promise.reject(new Error(`unexpected request to ${url}`));
  });

  return {fetcher, updates};
};

const button = (wrapper: VueWrapper, name: string) =>
  wrapper.findAll('button').find((candidate) => (candidate.attributes('aria-label') ?? candidate.text()) === name);

describe('RolePermissions editing (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it('shows no add or remove controls unless the handlers are given', () => {
    const {wrapper} = mountWith(BaseRolePermissions, {
      permissions: role.permissions,
      resourceServers: [{id: 'rs-1', name: 'Orders API'}],
    });

    expect(wrapper.find('form').exists()).toBe(false);
    expect(button(wrapper, 'Remove orders:read from Orders API')).toBeUndefined();
  });

  it('asks before removing a permission', async () => {
    const onRemove = vi.fn();
    const {wrapper} = mountWith(BaseRolePermissions, {
      onRemove,
      permissions: role.permissions,
      resourceServerNames: {'rs-1': 'Orders API'},
    });

    await button(wrapper, 'Remove orders:read from Orders API')!.trigger('click');
    expect(onRemove).not.toHaveBeenCalled();
    expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe('Remove orders:read from this role?');

    await button(wrapper, translate('admin.common.actions.cancel'))!.trigger('click');
    expect(wrapper.find('[role="group"]').exists()).toBe(false);

    await button(wrapper, 'Remove orders:read from Orders API')!.trigger('click');
    await button(wrapper, translate('admin.common.actions.confirm'))!.trigger('click');
    expect(onRemove).toHaveBeenCalledWith({permission: 'orders:read', resourceServerId: 'rs-1'});
  });

  it('picks a resource server, then one of its permissions not yet granted, and adds it', async () => {
    const onAdd = vi.fn();
    const onResourceServerSelect = vi.fn();
    const {wrapper} = mountWith(BaseRolePermissions, {
      availablePermissions: {
        'rs-1': [
          {name: 'Read', permission: 'orders:read'},
          {name: 'Write', permission: 'orders:write', resourceName: 'Orders'},
        ],
      },
      onAdd,
      onResourceServerSelect,
      permissions: role.permissions,
      resourceServers: [{id: 'rs-1', name: 'Orders API'}],
    });

    const [server] = findAllSelectControls(wrapper);
    await chooseOption(server, 'Orders API');
    expect(onResourceServerSelect).toHaveBeenCalledWith('rs-1');

    const [, permission] = findAllSelectControls(wrapper);
    const offered: string[] = Array.from((permission.element as HTMLSelectElement).options).map(
      (option: HTMLOptionElement) => option.value,
    );
    expect(offered).toContain('orders:write');
    expect(offered).not.toContain('orders:read');

    await chooseOption(permission, 'Orders / Write (orders:write)');
    await wrapper.find('form').trigger('submit');
    expect(onAdd).toHaveBeenCalledWith({permission: 'orders:write', resourceServerId: 'rs-1'});
  });

  it('hands the default slot the add and remove handlers only when editable', () => {
    const seen: BaseRolePermissionsRenderProps[] = [];
    const slot = {
      default: (props: BaseRolePermissionsRenderProps) => {
        seen.push(props);

        return h('span');
      },
    };

    mountWith(BaseRolePermissions, {permissions: role.permissions}, undefined, slot);
    mountWith(
      BaseRolePermissions,
      {
        onAdd: vi.fn(),
        onRemove: vi.fn(),
        onResourceServerSelect: vi.fn(),
        permissions: role.permissions,
        resourceServers: [{id: 'rs-1', name: 'Orders API'}],
      },
      undefined,
      slot,
    );

    expect(seen[0]).toMatchObject({onAdd: undefined, onRemove: undefined, resourceServers: undefined});
    expect(seen[1].onAdd).toBeTypeOf('function');
    expect(seen[1].onRemove).toBeTypeOf('function');
    expect(seen[1].resolveResourceServerName('rs-1')).toBe('Orders API');
  });

  it('is read-only by default and lists no resource servers', async () => {
    const {fetcher} = createServer();
    const {wrapper} = mountWith(RolePermissions, {roleId: 'r1'}, fetcher);

    await vi.waitFor(() => expect(wrapper.find('ul').text()).toContain('orders:read'));
    expect(wrapper.find('form').exists()).toBe(false);
    expect(fetcher.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(['/roles/r1']);
  });

  it('adds a permission picked from the resource server actions and saves the role', async () => {
    const {fetcher, updates} = createServer();
    const {wrapper} = mountWith(RolePermissions, {editable: true, roleId: 'r1'}, fetcher);

    await vi.waitFor(() => expect(wrapper.find('form').exists()).toBe(true));
    await chooseOption(findAllSelectControls(wrapper)[0], 'Orders API');
    await vi.waitFor(() =>
      expect((findAllSelectControls(wrapper)[1].element as HTMLSelectElement).textContent).toContain('orders:write'),
    );
    await chooseOption(findAllSelectControls(wrapper)[1], 'Write (orders:write)');
    await wrapper.find('form').trigger('submit');

    await vi.waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toEqual({
      name: 'Support',
      ouId: 'ou-1',
      permissions: [{permissions: ['orders:read', 'orders:write'], resourceServerId: 'rs-1'}],
    });
    await vi.waitFor(() => expect(wrapper.text()).toContain('orders:write'));
  });

  it('removes a permission through a custom render and saves the role', async () => {
    const {fetcher, updates} = createServer();
    let renderProps: BaseRolePermissionsRenderProps | undefined;

    mountWith(RolePermissions, {editable: true, roleId: 'r1'}, fetcher, {
      default: (props: BaseRolePermissionsRenderProps) => {
        renderProps = props;

        return h('span');
      },
    });

    await vi.waitFor(() => expect(renderProps?.onRemove).toBeTypeOf('function'));
    renderProps!.onRemove!({permission: 'orders:read', resourceServerId: 'rs-1'});

    await vi.waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toMatchObject({permissions: []});
  });

  it('is not editable for a read-only role', async () => {
    const {fetcher} = createServer({...role, isReadOnly: true});
    const {wrapper} = mountWith(RolePermissions, {editable: true, roleId: 'r1'}, fetcher);

    await vi.waitFor(() => expect(wrapper.find('ul').exists()).toBe(true));
    await nextTick();
    expect(wrapper.find('ul button').exists()).toBe(false);
  });

  it('RoleDetails passes editable through to the permissions', async () => {
    const {fetcher} = createServer();
    const {wrapper} = mountWith(RoleDetails, {editable: true, roleId: 'r1'}, fetcher);

    await vi.waitFor(() =>
      expect(
        wrapper.findAll('button').some((candidate) => candidate.text() === translate('admin.roles.permissions.add')),
      ).toBe(true),
    );
  });
});
