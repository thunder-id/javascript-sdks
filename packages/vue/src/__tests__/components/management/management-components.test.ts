// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentQueryKeys, ApplicationQueryKeys, GroupQueryKeys, RoleQueryKeys, UserQueryKeys} from '@thunderid/browser';
import type {
  Application,
  BasicApplication,
  Group,
  ManagedUser,
  ResourceQueryKey,
  RoleResourcePermissions,
} from '@thunderid/browser';
import {type DOMWrapper, type VueWrapper, flushPromises, mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {h, nextTick} from 'vue';
import AgentCreate from '../../../components/management/AgentCreate/AgentCreate';
import type {BaseAgentCreateRenderProps} from '../../../components/management/AgentCreate/BaseAgentCreate';
import AgentDetails from '../../../components/management/AgentDetails/AgentDetails';
import BaseAgentDetails from '../../../components/management/AgentDetails/BaseAgentDetails';
import type {BaseAgentDetailsRenderProps} from '../../../components/management/AgentDetails/BaseAgentDetails';
import AgentList from '../../../components/management/AgentList/AgentList';
import BaseAgentList from '../../../components/management/AgentList/BaseAgentList';
import ApplicationCreate from '../../../components/management/ApplicationCreate/ApplicationCreate';
import BaseApplicationCreate from '../../../components/management/ApplicationCreate/BaseApplicationCreate';
import type {BaseApplicationCreateRenderProps} from '../../../components/management/ApplicationCreate/BaseApplicationCreate';
import ApplicationDetails from '../../../components/management/ApplicationDetails/ApplicationDetails';
import BaseApplicationDetails from '../../../components/management/ApplicationDetails/BaseApplicationDetails';
import type {BaseApplicationDetailsRenderProps} from '../../../components/management/ApplicationDetails/BaseApplicationDetails';
import ApplicationList from '../../../components/management/ApplicationList/ApplicationList';
import BaseApplicationList from '../../../components/management/ApplicationList/BaseApplicationList';
import BaseGroupCreate from '../../../components/management/GroupCreate/BaseGroupCreate';
import type {BaseGroupCreateRenderProps} from '../../../components/management/GroupCreate/BaseGroupCreate';
import GroupCreate from '../../../components/management/GroupCreate/GroupCreate';
import BaseGroupDetails from '../../../components/management/GroupDetails/BaseGroupDetails';
import type {BaseGroupDetailsRenderProps} from '../../../components/management/GroupDetails/BaseGroupDetails';
import GroupDetails from '../../../components/management/GroupDetails/GroupDetails';
import GroupList from '../../../components/management/GroupList/GroupList';
import BaseGroupMembers from '../../../components/management/GroupMembers/BaseGroupMembers';
import type {BaseGroupMembersRenderProps} from '../../../components/management/GroupMembers/BaseGroupMembers';
import GroupMembers from '../../../components/management/GroupMembers/GroupMembers';
import type {BaseRoleAssignmentsRenderProps} from '../../../components/management/RoleAssignments/BaseRoleAssignments';
import RoleAssignments from '../../../components/management/RoleAssignments/RoleAssignments';
import RoleCreate from '../../../components/management/RoleCreate/RoleCreate';
import BaseRoleDetails from '../../../components/management/RoleDetails/BaseRoleDetails';
import type {BaseRoleDetailsRenderProps} from '../../../components/management/RoleDetails/BaseRoleDetails';
import RoleDetails from '../../../components/management/RoleDetails/RoleDetails';
import RoleList from '../../../components/management/RoleList/RoleList';
import BaseRolePermissions from '../../../components/management/RolePermissions/BaseRolePermissions';
import type {BaseRolePermissionsRenderProps} from '../../../components/management/RolePermissions/BaseRolePermissions';
import RolePermissions from '../../../components/management/RolePermissions/RolePermissions';
import type {AdminListRenderProps} from '../../../components/management/shared/createAdminList';
import BaseUserCreate from '../../../components/management/UserCreate/BaseUserCreate';
import type {BaseUserCreateRenderProps} from '../../../components/management/UserCreate/BaseUserCreate';
import UserCreate from '../../../components/management/UserCreate/UserCreate';
import BaseUserDetails from '../../../components/management/UserDetails/BaseUserDetails';
import type {BaseUserDetailsRenderProps} from '../../../components/management/UserDetails/BaseUserDetails';
import UserDetails from '../../../components/management/UserDetails/UserDetails';
import BaseUserList from '../../../components/management/UserList/BaseUserList';
import UserList from '../../../components/management/UserList/UserList';
import {
  type ManagementTestContext,
  createManagementContext,
  jsonResponse,
  translate,
} from '../../helpers/managementContext';
import {chooseOption, findAllSelectControls} from '../../helpers/selectControl';

const mounted: {unmount: () => void}[] = [];

const mountWith = (
  component: unknown,
  props: Record<string, unknown> = {},
  context = createManagementContext(),
  slots = {},
) => {
  const wrapper = mount(component as never, {
    attachTo: document.body,
    global: {provide: context.provide},
    props,
    slots,
  });
  mounted.push(wrapper);

  return {context, wrapper};
};

/** The keys the queries mounted on a context subscribed with, in order. */
const subscribedKeysOf = (context: ManagementTestContext) => {
  const subscribe = vi.spyOn(context.thunderID.invalidator, 'subscribe');

  return (): ResourceQueryKey[] =>
    subscribe.mock.calls.map((call) => JSON.parse(JSON.stringify(call[0])) as ResourceQueryKey);
};

/** The key prefixes a spied `invalidate` was called with, in order. */
const invalidatedKeys = (invalidate: {mock: {calls: unknown[][]}}): unknown[] =>
  invalidate.mock.calls.map((call) => call[0]);

const users = [
  {attributes: {given_name: 'Jane', family_name: 'Doe'}, id: 'u1', ouHandle: 'default', ouId: 'ou-1', type: 'person'},
  {display: 'John Roe', id: 'u2', ouId: 'ou-1', type: 'person'},
];

describe('admin components (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  describe('BaseUserList', () => {
    it('renders a captioned table with translated headers and a row per user', () => {
      const {wrapper} = mountWith(BaseUserList, {users});

      expect(wrapper.find('h2').text()).toBe(translate('admin.users.list.title'));
      expect(wrapper.find('caption').text()).toBe(translate('admin.users.list.title'));
      expect(wrapper.findAll('th').map((th) => th.text())).toEqual([
        translate('admin.users.list.columns.name'),
        translate('admin.users.list.columns.type'),
        translate('admin.common.columns.organization_unit'),
      ]);
      expect(wrapper.findAll('th').every((th) => th.attributes('scope') === 'col')).toBe(true);
      const rows = wrapper.findAll('tbody tr');
      expect(rows).toHaveLength(2);
      expect(rows[0].text()).toContain('Jane Doe');
      expect(rows[0].text()).toContain('default');
      expect(rows[1].text()).toContain('John Roe');
    });

    it('makes rows keyboard selectable buttons only when onSelect is set', async () => {
      const onSelect = vi.fn();
      const {wrapper} = mountWith(BaseUserList, {onSelect, selectedUserId: 'u2', users});

      const buttons = wrapper.findAll('tbody button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].attributes('aria-pressed')).toBe('false');
      expect(buttons[1].attributes('aria-pressed')).toBe('true');

      await buttons[0].trigger('click');
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({id: 'u1'}));

      const {wrapper: readOnly} = mountWith(BaseUserList, {users});
      expect(readOnly.findAll('tbody button')).toHaveLength(0);
    });

    it('paginates and renders the actions slot, empty and error states', async () => {
      const onPageChange = vi.fn();
      const {wrapper} = mountWith(
        BaseUserList,
        {error: 'Boom', limit: 2, offset: 0, onPageChange, totalResults: 5, users},
        undefined,
        {actions: () => h('button', {class: 'add-user'}, 'Add')},
      );

      expect(wrapper.find('.add-user').exists()).toBe(true);
      expect(wrapper.find('[role="alert"]').text()).toBe('Boom');
      const nav = wrapper.find('nav');
      expect(nav.attributes('aria-label')).toBe(translate('admin.common.pagination.label'));
      expect(nav.text()).toContain(translate('admin.common.pagination.range', {end: 2, start: 1, total: 5}));
      await nav.findAll('button')[1].trigger('click');
      expect(onPageChange).toHaveBeenCalledWith(2);

      const {wrapper: empty} = mountWith(BaseUserList, {users: []});
      expect(empty.find('tbody').text()).toBe(translate('admin.users.list.empty'));
    });

    it('applies component-level i18n bundle overrides', () => {
      const {wrapper} = mountWith(BaseUserList, {
        preferences: {i18n: {bundles: {'en-US': {translations: {'admin.users.list.title': 'People'}}}}},
        users,
      });

      expect(wrapper.find('h2').text()).toBe('People');
    });
  });

  describe('BaseGroupCreate', () => {
    it('labels its fields, gates submit on a name and emits the trimmed values', async () => {
      const onCancel = vi.fn();
      const {wrapper} = mountWith(BaseGroupCreate, {onCancel});

      const inputs = wrapper.findAll('input');
      const labels = wrapper.findAll('label');
      expect(labels.map((label) => label.text().replace(' *', ''))).toEqual([
        translate('admin.groups.create.fields.name'),
        translate('admin.groups.create.fields.description'),
      ]);
      labels.forEach((label, index) => expect(label.attributes('for')).toBe(inputs[index].attributes('id')));
      const submit = wrapper.find('button[type="submit"]');
      expect(submit.attributes('disabled')).toBeDefined();

      await inputs[0].setValue('  Ops  ');
      await inputs[1].setValue(' ');
      expect(submit.attributes('disabled')).toBeUndefined();
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('submit')).toEqual([[{description: undefined, name: 'Ops'}]]);

      await wrapper.find('button[type="button"]').trigger('click');
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('BaseGroupMembers', () => {
    it('adds a picked identity and removes a member with a labelled button', async () => {
      const onAdd = vi.fn();
      const onRemove = vi.fn();
      const {wrapper} = mountWith(BaseGroupMembers, {
        candidates: {
          agent: [{id: 'a1', label: 'Bot'}],
          user: [
            {id: 'u1', label: 'Jane Doe'},
            {id: 'u2', label: 'John Roe'},
          ],
        },
        members: [{display: 'Jane Doe', id: 'u1', type: 'user'}],
        onAdd,
        onRemove,
      });

      const [typeSelect, identitySelect] = findAllSelectControls(wrapper);
      // Current members are not offered again.
      expect(Array.from((identitySelect.element as HTMLSelectElement).options).map((o) => o.textContent)).toEqual([
        translate('admin.common.fields.identity_placeholder'),
        'John Roe',
      ]);
      await chooseOption(identitySelect, 'John Roe');
      await wrapper.find('form').trigger('submit');
      expect(onAdd).toHaveBeenCalledWith({id: 'u2', type: 'user'});

      await chooseOption(typeSelect, translate('admin.common.identity_types.agent'));
      expect(
        Array.from((findAllSelectControls(wrapper)[1].element as HTMLSelectElement).options).map((o) => o.textContent),
      ).toContain('Bot');

      const remove = wrapper.find(
        `button[aria-label="${translate('admin.groups.members.remove_label', {name: 'Jane Doe'})}"]`,
      );
      expect(remove.exists()).toBe(true);
      await remove.trigger('click');
      expect(onRemove).toHaveBeenCalledWith({display: 'Jane Doe', id: 'u1', type: 'user'});
    });
  });

  describe('BaseUserDetails', () => {
    it('asks for confirmation before deleting, and edits text attributes keeping the others', async () => {
      const onDelete = vi.fn();
      const onUpdate = vi.fn();
      const user = {
        attributes: {
          email: 'jane@example.com',
          family_name: 'Doe',
          given_name: 'Jane',
          password: 'secret',
          tags: ['a'],
        },
        id: 'u1',
        ouId: 'ou-1',
        type: 'person',
      };
      const {wrapper} = mountWith(BaseUserDetails, {
        groups: [{id: 'g1', name: 'Ops', ouId: 'ou-1'}],
        onDelete,
        onUpdate,
        user,
      });

      expect(wrapper.find('h2').text()).toBe('Jane Doe');
      expect(wrapper.text()).not.toContain('secret');
      expect(wrapper.find(`ul[aria-label="${translate('admin.users.details.groups')}"]`).text()).toContain('Ops');

      const deleteButton = wrapper
        .findAll('button')
        .find((b) => b.text() === translate('admin.users.details.delete.action'))!;
      await deleteButton.trigger('click');
      expect(onDelete).not.toHaveBeenCalled();
      const group = wrapper.find('[role="group"]');
      expect(group.attributes('aria-label')).toBe(translate('admin.users.details.delete.confirm', {name: 'Jane Doe'}));
      await group.findAll('button')[1].trigger('click');
      expect(onDelete).toHaveBeenCalledTimes(1);

      const editButton = wrapper
        .findAll('button')
        .find((b) => b.text() === translate('admin.users.details.edit.action'))!;
      await editButton.trigger('click');
      const emailInput = wrapper
        .findAll('input')
        .find((input) => (input.element as HTMLInputElement).value === 'jane@example.com')!;
      await emailInput.setValue('jane@new.example');
      await wrapper.find('form').trigger('submit');
      expect(onUpdate).toHaveBeenCalledWith({...user.attributes, email: 'jane@new.example'});
    });
  });

  describe('connected components', () => {
    it('GroupList fetches its page and shows a translated message instead of the server text on 403', async () => {
      const context = createManagementContext();
      context.fetcher.mockResolvedValue(jsonResponse({code: 'GRP-1', message: 'raw server detail'}, 403));
      const {wrapper} = mountWith(GroupList, {}, context);

      await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true));
      expect(context.fetcher.mock.calls[0][0]).toMatch(/^https:\/\/thunder\.example\/groups\?/);
      expect(wrapper.find('[role="alert"]').text()).toBe(translate('admin.common.errors.forbidden'));
      expect(wrapper.text()).not.toContain('raw server detail');
    });

    it('UserDetails loads the user and their groups, and deletes through the API', async () => {
      const context = createManagementContext();
      context.fetcher.mockImplementation((url: string, init: RequestInit) => {
        if (init.method === 'DELETE') return Promise.resolve(jsonResponse(null, 204));
        if (url.includes('/groups')) {
          return Promise.resolve(
            jsonResponse({count: 1, groups: [{id: 'g1', name: 'Ops', ouId: 'ou-1'}], startIndex: 1, totalResults: 1}),
          );
        }

        return Promise.resolve(jsonResponse(users[1]));
      });
      const {wrapper} = mountWith(UserDetails, {deletable: true, userId: 'u2'}, context);

      await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('John Roe'));
      await vi.waitFor(() => expect(wrapper.text()).toContain('Ops'));
      expect(context.fetcher.mock.calls.map((call) => call[0])).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^https:\/\/thunder\.example\/users\/u2(\?|$)/),
          expect.stringMatching(/\/users\/u2\/groups\?/),
        ]),
      );

      await wrapper
        .findAll('button')
        .find((b) => b.text() === translate('admin.users.details.delete.action'))!
        .trigger('click');
      await wrapper.find('[role="group"]').findAll('button')[1].trigger('click');

      await vi.waitFor(() => expect(wrapper.emitted('deleted')).toHaveLength(1));
      const deleteCall = context.fetcher.mock.calls.find((call) => call[1].method === 'DELETE')!;
      expect(deleteCall[0]).toBe('https://thunder.example/users/u2');
    });

    it("RoleCreate creates the role in the signed-in user's organization unit and emits created", async () => {
      const context = createManagementContext();
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockResolvedValue(jsonResponse({id: 'r1', name: 'Auditor', ouId: 'ou-1', permissions: []}, 201));
      const {wrapper} = mountWith(RoleCreate, {}, context);

      await wrapper.findAll('input')[0].setValue('Auditor');
      await wrapper.find('form').trigger('submit');

      await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));
      expect(context.fetcher.mock.calls[0][0]).toBe('https://thunder.example/roles');
      expect(JSON.parse(context.fetcher.mock.calls[0][1].body as string)).toEqual({name: 'Auditor', ouId: 'ou-1'});
      expect(wrapper.emitted('created')![0][0]).toMatchObject({id: 'r1'});
      expect(invalidatedKeys(invalidate)).toEqual([[RoleQueryKeys.ROLES], [RoleQueryKeys.ROLE_ASSIGNMENTS]]);
    });
  });

  describe('connected components data loading and mutations', () => {
    const page = {count: 0, startIndex: 1, totalResults: 0};

    /** Answers each request with an empty page of every list shape, or the given resource. */
    const respondWith =
      (resolve: (url: URL, init: RequestInit) => unknown = () => undefined) =>
      (url: string, init: RequestInit): Promise<Response> => {
        const body: unknown = resolve(new URL(url), init);

        if (body === null) return Promise.resolve(jsonResponse(null, 204));

        return Promise.resolve(
          jsonResponse(
            body ?? {...page, agents: [], assignments: [], groups: [], members: [], roles: [], types: [], users: []},
          ),
        );
      };

    const requests = (context: ManagementTestContext): string[] =>
      context.fetcher.mock.calls.map((call) => {
        const url = new URL(call[0]);

        return `${call[1].method ?? 'GET'} ${url.pathname}${url.search}`;
      });

    const subscribedKeys = (context: ManagementTestContext) => {
      const subscribe = vi.spyOn(context.thunderID.invalidator, 'subscribe');

      return (): ResourceQueryKey[] =>
        subscribe.mock.calls.map((call) => JSON.parse(JSON.stringify(call[0])) as ResourceQueryKey);
    };

    it('RoleList fetches a page of roles under the roles key', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      context.fetcher.mockImplementation(
        respondWith(() => ({...page, roles: [{id: 'r1', name: 'Auditor', ouId: 'ou-1'}], totalResults: 1})),
      );
      const {wrapper} = mountWith(RoleList, {}, context);

      await vi.waitFor(() => expect(wrapper.text()).toContain('Auditor'));
      expect(requests(context)).toEqual(['GET /roles?include=display&limit=20&offset=0']);
      expect(keys()).toEqual([[RoleQueryKeys.ROLES, {limit: 20, offset: 0}]]);
    });

    it('UserDetails keys the user and their groups, and updates through PUT', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        respondWith((url, init) => (url.pathname === '/users/u2' || init.method === 'PUT' ? users[1] : undefined)),
      );
      let renderProps: BaseUserDetailsRenderProps | undefined;
      mountWith(UserDetails, {editable: true, userId: 'u2'}, context, {
        default: (props: BaseUserDetailsRenderProps) => {
          renderProps = props;

          return h('span', props.displayName);
        },
      });

      await vi.waitFor(() => expect(renderProps?.user?.id).toBe('u2'));
      expect(keys()).toEqual([
        [UserQueryKeys.USER, 'u2'],
        [GroupQueryKeys.MEMBERSHIPS, 'user', 'u2', {limit: 100}],
      ]);
      expect(requests(context)).toEqual(
        expect.arrayContaining(['GET /users/u2?include=display', 'GET /users/u2/groups?limit=100']),
      );

      renderProps!.onUpdate!({email: 'john@example.com'});

      await vi.waitFor(() => expect(invalidate).toHaveBeenCalled());
      const update = context.fetcher.mock.calls.find((call) => call[1].method === 'PUT')!;
      expect(update[0]).toBe('https://thunder.example/users/u2');
      expect(JSON.parse(update[1].body as string)).toEqual({
        attributes: {email: 'john@example.com'},
        ouId: 'ou-1',
        type: 'person',
      });
      expect(invalidatedKeys(invalidate)).toEqual([[UserQueryKeys.USER, 'u2'], [UserQueryKeys.USERS]]);
    });

    it('UserDetails invalidates the users lists after a delete', async () => {
      const context = createManagementContext();
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        respondWith((url, init) =>
          init.method === 'DELETE' ? null : url.pathname === '/users/u2' ? users[1] : undefined,
        ),
      );
      let renderProps: BaseUserDetailsRenderProps | undefined;
      const {wrapper} = mountWith(UserDetails, {deletable: true, userId: 'u2'}, context, {
        default: (props: BaseUserDetailsRenderProps) => {
          renderProps = props;

          return h('span', props.displayName);
        },
      });

      await vi.waitFor(() => expect(renderProps?.user?.id).toBe('u2'));
      renderProps!.onDelete!();

      await vi.waitFor(() => expect(wrapper.emitted('deleted')).toHaveLength(1));
      expect(invalidatedKeys(invalidate)).toEqual([[UserQueryKeys.USERS]]);
    });

    it('AgentDetails loads the agent, its groups and roles, and deletes it', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        respondWith((url, init) => {
          if (init.method === 'DELETE') return null;
          if (url.pathname === '/agents/a1') {
            return {attributes: {name: 'Concierge'}, display: 'Concierge', id: 'a1', ouId: 'ou-1', type: 'assistant'};
          }
          if (url.pathname === '/agents/a1/roles') return {...page, roles: ['viewer']};

          return {...page, groups: [{id: 'g1', name: 'Ops', ouId: 'ou-1'}]};
        }),
      );
      let renderProps: BaseAgentDetailsRenderProps | undefined;
      const {wrapper} = mountWith(AgentDetails, {agentId: 'a1', deletable: true}, context, {
        default: (props: BaseAgentDetailsRenderProps) => {
          renderProps = props;

          return h('span', props.agent?.display);
        },
      });

      await vi.waitFor(() => {
        expect(renderProps?.agent?.display).toBe('Concierge');
        expect(renderProps?.roles).toEqual(['viewer']);
        expect(renderProps?.groups.map((group) => group.name)).toEqual(['Ops']);
      });
      expect(keys()).toEqual([
        [AgentQueryKeys.AGENT, 'a1'],
        [GroupQueryKeys.MEMBERSHIPS, 'agent', 'a1', {limit: 100}],
        [RoleQueryKeys.ROLE_ASSIGNMENTS, 'agent', 'a1', {limit: 100}],
      ]);
      expect(requests(context)).toEqual(
        expect.arrayContaining([
          'GET /agents/a1?include=display',
          'GET /agents/a1/groups?limit=100',
          'GET /agents/a1/roles?limit=100',
        ]),
      );

      renderProps!.onDelete!();

      await vi.waitFor(() => expect(wrapper.emitted('deleted')).toHaveLength(1));
      expect(requests(context)).toContain('DELETE /agents/a1');
      expect(invalidatedKeys(invalidate)).toEqual([[AgentQueryKeys.AGENTS]]);
    });

    it('GroupDetails loads the group, lists its members from its organization unit, and deletes it', async () => {
      const context = createManagementContext();
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        respondWith((url, init) => {
          if (init.method === 'DELETE') return null;
          if (url.pathname === '/groups/g1') return {description: 'On call', id: 'g1', name: 'Ops', ouId: 'ou-9'};
          if (url.pathname === '/groups/g1/members') {
            return {...page, count: 1, members: [{display: 'Aiko Tanaka', id: 'u1', type: 'user'}], totalResults: 1};
          }

          return undefined;
        }),
      );
      const {wrapper} = mountWith(GroupDetails, {deletable: true, editable: true, groupId: 'g1'}, context);

      await vi.waitFor(() => {
        expect(wrapper.find('h2').text()).toBe('Ops');
        expect(wrapper.text()).toContain('On call');
        expect(wrapper.text()).toContain('Aiko Tanaka');
      });
      await vi.waitFor(() =>
        expect(
          context.fetcher.mock.calls.some((call) => {
            const url = new URL(call[0]);

            return url.pathname === '/users' && url.searchParams.get('filter') === 'ouId eq "ou-9"';
          }),
        ).toBe(true),
      );

      const deleteButton = wrapper
        .findAll('button')
        .find((button) => button.text() === translate('admin.groups.details.delete.action'));
      await deleteButton!.trigger('click');
      const confirm = wrapper
        .findAll('button')
        .find((button) => button.text() === translate('admin.common.actions.confirm'));
      await confirm!.trigger('click');

      await vi.waitFor(() => expect(wrapper.emitted('deleted')).toHaveLength(1));
      expect(requests(context)).toContain('DELETE /groups/g1');
      expect(invalidatedKeys(invalidate)).toEqual(
        expect.arrayContaining([
          [GroupQueryKeys.GROUPS],
          [GroupQueryKeys.MEMBERSHIPS],
          [RoleQueryKeys.ROLE_ASSIGNMENTS],
        ]),
      );
    });

    it('GroupDetails hands the group and its delete action to a custom render', async () => {
      const context = createManagementContext();
      context.fetcher.mockImplementation(
        respondWith((url) => (url.pathname === '/groups/g1' ? {id: 'g1', name: 'Ops', ouId: 'ou-1'} : undefined)),
      );
      let renderProps: BaseGroupDetailsRenderProps | undefined;
      mountWith(GroupDetails, {groupId: 'g1'}, context, {
        default: (props: BaseGroupDetailsRenderProps) => {
          renderProps = props;

          return h('span', props.group?.name);
        },
      });

      await vi.waitFor(() => expect(renderProps?.group?.name).toBe('Ops'));
      // Deletion is off unless the app turns it on, and a custom render replaces the members view.
      expect(renderProps?.onDelete).toBeUndefined();
      expect(requests(context)).not.toContain('GET /groups/g1/members?include=display&limit=100');
    });

    it('RoleDetails loads the role once for its overview and permissions, and lists its assignments', async () => {
      const context = createManagementContext();
      context.fetcher.mockImplementation(
        respondWith((url) => {
          if (url.pathname === '/roles/r1') {
            return {
              id: 'r1',
              name: 'Viewer',
              ouId: 'ou-1',
              permissions: [{permissions: ['system:user:view'], resourceServerId: 'rs-1'}],
            };
          }
          if (url.pathname === '/roles/r1/assignments') {
            return {
              ...page,
              assignments: [{display: 'Deploy bot', id: 'a1', type: 'agent'}],
              count: 1,
              totalResults: 1,
            };
          }

          return undefined;
        }),
      );
      const {wrapper} = mountWith(RoleDetails, {deletable: true, roleId: 'r1'}, context);

      await vi.waitFor(() => {
        expect(wrapper.find('h2').text()).toBe('Viewer');
        expect(wrapper.text()).toContain('system:user:view');
        expect(wrapper.text()).toContain('Deploy bot');
        expect(wrapper.text()).toContain(translate('admin.roles.details.delete.action'));
      });
      expect(requests(context).filter((request) => request.startsWith('GET /roles/r1?'))).toHaveLength(1);
    });

    it('BaseRoleDetails never offers to delete a read-only role', () => {
      const role = {id: 'r1', isReadOnly: true, name: 'Admin', ouId: 'ou-1'};
      const {wrapper} = mountWith(BaseRoleDetails, {onDelete: vi.fn(), role});

      expect(wrapper.text()).toContain('Admin');
      expect(wrapper.text()).not.toContain(translate('admin.roles.details.delete.action'));

      let renderProps: BaseRoleDetailsRenderProps | undefined;
      mountWith(BaseRoleDetails, {onDelete: vi.fn(), role}, createManagementContext(), {
        default: (props: BaseRoleDetailsRenderProps) => {
          renderProps = props;

          return h('span');
        },
      });
      expect(renderProps?.role?.name).toBe('Admin');
      expect(renderProps?.onDelete).toBeUndefined();
    });

    it('BaseGroupDetails renders the members slot under the overview', () => {
      const {wrapper} = mountWith(
        BaseGroupDetails,
        {group: {id: 'g1', name: 'Ops', ouHandle: 'engineering', ouId: 'ou-1'}},
        createManagementContext(),
        {members: () => h('p', 'member list')},
      );

      expect(wrapper.text()).toContain('engineering');
      expect(wrapper.text()).toContain('member list');
    });

    it('GroupCreate creates the group and invalidates group and membership lists', async () => {
      const context = createManagementContext();
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockResolvedValue(jsonResponse({id: 'g1', name: 'Ops', ouId: 'ou-1'}, 201));
      const {wrapper} = mountWith(GroupCreate, {}, context);

      await wrapper.findAll('input')[0].setValue('Ops');
      await wrapper.find('form').trigger('submit');

      await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));
      expect(requests(context)).toEqual(['POST /groups']);
      expect(JSON.parse(context.fetcher.mock.calls[0][1].body as string)).toEqual({name: 'Ops', ouId: 'ou-1'});
      expect(invalidatedKeys(invalidate)).toEqual([[GroupQueryKeys.GROUPS], [GroupQueryKeys.MEMBERSHIPS]]);
    });

    it('AgentCreate offers the agent types and creates the agent', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        respondWith((_url, init) =>
          init.method === 'POST'
            ? {attributes: {name: 'Concierge'}, id: 'a1', ouId: 'ou-1', type: 'assistant'}
            : {...page, types: [{displayName: 'Assistant', handle: 'assistant'}]},
        ),
      );
      const owner = {id: 'jane@example.com', idType: 'email', isLocal: false};
      let renderProps: BaseAgentCreateRenderProps | undefined;
      const {wrapper} = mountWith(AgentCreate, {owner}, context, {
        default: (props: BaseAgentCreateRenderProps) => {
          renderProps = props;

          return h('span', props.agentTypes.map((option) => option.label).join(','));
        },
      });

      await vi.waitFor(() => expect(wrapper.text()).toBe('Assistant'));
      expect(requests(context)).toEqual(['GET /agent-types?include=display&limit=100']);
      expect(keys()).toEqual([[AgentQueryKeys.AGENT_TYPES, {limit: 100}]]);

      renderProps!.handleInputChange('name', 'Concierge');
      renderProps!.handleInputChange('type', 'assistant');
      await nextTick();
      renderProps!.handleSubmit();

      await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));
      const create = context.fetcher.mock.calls.find((call) => call[1].method === 'POST')!;
      expect(create[0]).toBe('https://thunder.example/agents');
      expect(JSON.parse(create[1].body as string)).toEqual({
        attributes: {name: 'Concierge'},
        ouId: 'ou-1',
        owner,
        type: 'assistant',
      });
      expect(invalidatedKeys(invalidate)).toEqual([[AgentQueryKeys.AGENTS]]);
    });

    it('UserCreate offers the user types and creates the user', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        respondWith((_url, init) =>
          init.method === 'POST' ? users[1] : {...page, types: [{displayName: 'Person', handle: 'person'}]},
        ),
      );
      let renderProps: BaseUserCreateRenderProps | undefined;
      const {wrapper} = mountWith(UserCreate, {}, context, {
        default: (props: BaseUserCreateRenderProps) => {
          renderProps = props;

          return h('span', props.userTypes.map((option) => option.label).join(','));
        },
      });

      await vi.waitFor(() => expect(wrapper.text()).toBe('Person'));
      expect(requests(context)).toEqual(['GET /user-types?include=display&limit=100']);
      expect(keys()).toEqual([[UserQueryKeys.USER_TYPES, {limit: 100}]]);

      renderProps!.handleInputChange('username', 'john');
      renderProps!.handleInputChange('email', 'john@example.com');
      await nextTick();
      renderProps!.handleSubmit();

      await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));
      const create = context.fetcher.mock.calls.find((call) => call[1].method === 'POST')!;
      expect(create[0]).toBe('https://thunder.example/users');
      expect(JSON.parse(create[1].body as string)).toEqual({
        attributes: {email: 'john@example.com', username: 'john'},
        ouId: 'ou-1',
        type: 'person',
      });
      expect(invalidatedKeys(invalidate)).toEqual([[UserQueryKeys.USERS]]);
    });

    it('GroupMembers loads members, fetches candidates only when editable, and adds and removes members', async () => {
      const readOnly = createManagementContext();
      const readOnlyKeys = subscribedKeys(readOnly);
      readOnly.fetcher.mockImplementation(respondWith());
      mountWith(GroupMembers, {groupId: 'g1'}, readOnly);

      await vi.waitFor(() => expect(readOnly.fetcher).toHaveBeenCalled());
      await nextTick();
      expect(requests(readOnly)).toEqual(['GET /groups/g1/members?include=display&limit=100']);
      expect(readOnlyKeys()).toEqual([[GroupQueryKeys.GROUP_MEMBERS, 'g1', {limit: 100}]]);

      const context = createManagementContext();
      const keys = subscribedKeys(context);
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        respondWith((_url, init) => (init.method === 'POST' ? {id: 'g1', name: 'Ops', ouId: 'ou-1'} : undefined)),
      );
      let renderProps: BaseGroupMembersRenderProps | undefined;
      mountWith(GroupMembers, {editable: true, groupId: 'g1'}, context, {
        default: (props: BaseGroupMembersRenderProps) => {
          renderProps = props;

          return h('span');
        },
      });

      await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(3));
      expect(requests(context)).toEqual(
        expect.arrayContaining([
          'GET /groups/g1/members?include=display&limit=100',
          'GET /users?include=display&limit=100',
          'GET /agents?include=display&limit=100',
        ]),
      );
      expect(keys()).toEqual([
        [GroupQueryKeys.GROUP_MEMBERS, 'g1', {limit: 100}],
        [UserQueryKeys.USERS, {limit: 100}],
        [AgentQueryKeys.AGENTS, {limit: 100}],
      ]);
      const membershipKeys = [
        [GroupQueryKeys.GROUP, 'g1'],
        [GroupQueryKeys.GROUP_MEMBERS, 'g1'],
        [GroupQueryKeys.MEMBERSHIPS],
        [RoleQueryKeys.ROLE_ASSIGNMENTS],
      ];

      renderProps!.onAdd!({id: 'u1', type: 'user'});
      await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4));
      expect(requests(context)).toContain('POST /groups/g1/members/add');
      expect(invalidatedKeys(invalidate)).toEqual(membershipKeys);

      invalidate.mockClear();
      renderProps!.onRemove!({display: 'Jane Doe', id: 'u1', type: 'user'});
      await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4));
      expect(requests(context)).toContain('POST /groups/g1/members/remove');
      expect(invalidatedKeys(invalidate)).toEqual(membershipKeys);
    });

    it('GroupMembers lists the candidates from the organization unit it is given', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      context.fetcher.mockImplementation(respondWith());
      mountWith(GroupMembers, {editable: true, groupId: 'g1', ouId: 'ou-1'}, context);

      await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(3));
      const filter = 'ouId eq "ou-1"';
      const query: string = new URLSearchParams({filter, include: 'display', limit: '100'}).toString();
      expect(requests(context)).toEqual(
        expect.arrayContaining([
          'GET /groups/g1/members?include=display&limit=100',
          `GET /users?${query}`,
          `GET /agents?${query}`,
        ]),
      );
      expect(keys()).toEqual([
        [GroupQueryKeys.GROUP_MEMBERS, 'g1', {limit: 100}],
        [UserQueryKeys.USERS, {filter, limit: 100}],
        [AgentQueryKeys.AGENTS, {filter, limit: 100}],
      ]);
    });

    it.each<[string, () => Promise<Response>]>([
      ['is pending', () => new Promise<Response>(() => undefined)],
      ['has failed', () => Promise.resolve(jsonResponse({}, 500))],
    ])(
      'GroupMembers offers no candidates from the previous organization unit while the new list %s',
      async (_state, listNext) => {
        const context = createManagementContext();
        context.fetcher.mockImplementation((url: string, init: RequestInit) =>
          new URL(url).searchParams.get('filter') === 'ouId eq "ou-2"'
            ? listNext()
            : respondWith(() => ({
                ...page,
                agents: [{attributes: {name: 'Deploy bot'}, id: 'ag-1'}],
                members: [],
                users: [{display: 'Aiko Tanaka', id: 'u-1'}],
              }))(url, init),
        );
        let renderProps: BaseGroupMembersRenderProps | undefined;
        const {wrapper} = mountWith(GroupMembers, {editable: true, groupId: 'g1', ouId: 'ou-1'}, context, {
          default: (props: BaseGroupMembersRenderProps) => {
            renderProps = props;

            return h('span');
          },
        });

        await vi.waitFor(() => expect(renderProps?.candidates?.user).toHaveLength(1));
        expect(renderProps?.candidates?.agent).toHaveLength(1);

        await wrapper.setProps({ouId: 'ou-2'});

        await vi.waitFor(() =>
          expect(requests(context).filter((request: string) => request.includes('ou-2'))).toHaveLength(2),
        );
        await nextTick();
        expect(renderProps?.candidates).toEqual({agent: [], user: []});
      },
    );

    it('RoleAssignments loads assignments and candidates, and assigns and unassigns', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(respondWith((_url, init) => (init.method === 'POST' ? null : undefined)));
      let renderProps: BaseRoleAssignmentsRenderProps | undefined;
      mountWith(RoleAssignments, {editable: true, roleId: 'r1'}, context, {
        default: (props: BaseRoleAssignmentsRenderProps) => {
          renderProps = props;

          return h('span');
        },
      });

      await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(4));
      expect(requests(context)).toEqual(
        expect.arrayContaining([
          'GET /roles/r1/assignments?include=display&limit=100',
          'GET /users?include=display&limit=100',
          'GET /groups?include=display&limit=100',
          'GET /agents?include=display&limit=100',
        ]),
      );
      expect(keys()).toEqual([
        [RoleQueryKeys.ROLE_ASSIGNMENTS, 'r1', {limit: 100}],
        [UserQueryKeys.USERS, {limit: 100}],
        [GroupQueryKeys.GROUPS, {limit: 100}],
        [AgentQueryKeys.AGENTS, {limit: 100}],
      ]);

      renderProps!.onTypeFilterChange!('group');
      await vi.waitFor(() =>
        expect(keys()).toContainEqual([RoleQueryKeys.ROLE_ASSIGNMENTS, 'r1', {limit: 100, type: 'group'}]),
      );

      renderProps!.onAssign!({id: 'g1', type: 'group'});
      await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
      expect(requests(context)).toContain('POST /roles/r1/assignments/add');
      expect(invalidatedKeys(invalidate)).toEqual([[RoleQueryKeys.ROLE_ASSIGNMENTS]]);

      renderProps!.onUnassign!({display: 'Ops', id: 'g1', type: 'group'});
      await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
      expect(requests(context)).toContain('POST /roles/r1/assignments/remove');
      expect(invalidatedKeys(invalidate)).toEqual([[RoleQueryKeys.ROLE_ASSIGNMENTS], [RoleQueryKeys.ROLE_ASSIGNMENTS]]);
    });

    it('RoleAssignments lists the candidates from the organization unit it is given', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      context.fetcher.mockImplementation(respondWith());
      mountWith(RoleAssignments, {editable: true, ouId: 'ou-1', roleId: 'r1'}, context);

      await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalledTimes(4));
      const filter = 'ouId eq "ou-1"';
      const query: string = new URLSearchParams({filter, include: 'display', limit: '100'}).toString();
      expect(requests(context)).toEqual(
        expect.arrayContaining([
          'GET /roles/r1/assignments?include=display&limit=100',
          `GET /users?${query}`,
          `GET /groups?${query}`,
          `GET /agents?${query}`,
        ]),
      );
      expect(keys()).toEqual([
        [RoleQueryKeys.ROLE_ASSIGNMENTS, 'r1', {limit: 100}],
        [UserQueryKeys.USERS, {filter, limit: 100}],
        [GroupQueryKeys.GROUPS, {filter, limit: 100}],
        [AgentQueryKeys.AGENTS, {filter, limit: 100}],
      ]);
    });

    it.each<[string, () => Promise<Response>]>([
      ['is pending', () => new Promise<Response>(() => undefined)],
      ['has failed', () => Promise.resolve(jsonResponse({}, 500))],
    ])(
      'RoleAssignments offers no candidates from the previous organization unit while the new list %s',
      async (_state, listNext) => {
        const context = createManagementContext();
        context.fetcher.mockImplementation((url: string, init: RequestInit) =>
          new URL(url).searchParams.get('filter') === 'ouId eq "ou-2"'
            ? listNext()
            : respondWith(() => ({
                ...page,
                agents: [{attributes: {name: 'Deploy bot'}, id: 'ag-1'}],
                assignments: [],
                groups: [{id: 'g-1', name: 'Ops'}],
                users: [{display: 'Aiko Tanaka', id: 'u-1'}],
              }))(url, init),
        );
        let renderProps: BaseRoleAssignmentsRenderProps | undefined;
        const {wrapper} = mountWith(RoleAssignments, {editable: true, ouId: 'ou-1', roleId: 'r1'}, context, {
          default: (props: BaseRoleAssignmentsRenderProps) => {
            renderProps = props;

            return h('span');
          },
        });

        await vi.waitFor(() => expect(renderProps?.candidates?.user).toHaveLength(1));
        expect(renderProps?.candidates?.group).toHaveLength(1);
        expect(renderProps?.candidates?.agent).toHaveLength(1);

        await wrapper.setProps({ouId: 'ou-2'});

        await vi.waitFor(() =>
          expect(requests(context).filter((request: string) => request.includes('ou-2'))).toHaveLength(3),
        );
        await nextTick();
        expect(renderProps?.candidates).toEqual({agent: [], group: [], user: []});
      },
    );

    it('RolePermissions loads the role under its key', async () => {
      const context = createManagementContext();
      const keys = subscribedKeys(context);
      context.fetcher.mockResolvedValue(
        jsonResponse({
          id: 'r1',
          name: 'Auditor',
          ouId: 'ou-1',
          permissions: [{permissions: ['read'], resourceServerId: 'rs-1'}],
        }),
      );
      let renderProps: BaseRolePermissionsRenderProps | undefined;
      mountWith(RolePermissions, {roleId: 'r1'}, context, {
        default: (props: BaseRolePermissionsRenderProps) => {
          renderProps = props;

          return h('span');
        },
      });

      await vi.waitFor(() => expect(renderProps?.permissions).toHaveLength(1));
      expect(requests(context)).toEqual(['GET /roles/r1?include=display']);
      expect(keys()).toEqual([[RoleQueryKeys.ROLE, 'r1']]);
    });
  });

  describe('default scoped slot (render props)', () => {
    it('hands a list its rows, default columns and pagination instead of rendering the table', async () => {
      const onPageChange = vi.fn();
      const {wrapper} = mountWith(
        BaseUserList,
        {limit: 20, offset: 20, onPageChange, totalResults: 45, users},
        createManagementContext(),
        {
          default: (props: AdminListRenderProps<ManagedUser> & {users: ManagedUser[]}) =>
            h('div', [
              h('p', {class: 'summary'}, `${props.rows.length} of ${props.totalResults} from ${props.offset}`),
              h('p', {class: 'columns'}, props.columns.map((column: {id: string}) => column.id).join(',')),
              h('p', {class: 'named'}, props.users.map((user: ManagedUser) => user.id).join(',')),
              h('button', {onClick: () => props.onPageChange?.(40)}, 'Next'),
            ]),
        },
      );

      expect(wrapper.find('table').exists()).toBe(false);
      expect(wrapper.find('.summary').text()).toBe('2 of 45 from 20');
      expect(wrapper.find('.columns').text()).toBe('name,type,ou');
      expect(wrapper.find('.named').text()).toBe('u1,u2');
      await wrapper.find('button').trigger('click');
      expect(onPageChange).toHaveBeenCalledWith(40);
    });

    it('passes the rows a connected list fetched to its slot', async () => {
      const context = createManagementContext();
      context.fetcher.mockResolvedValue(
        jsonResponse({count: 1, groups: [{id: 'g1', name: 'Admins', ouId: 'ou-1'}], startIndex: 1, totalResults: 1}),
      );
      const {wrapper} = mountWith(GroupList, {}, context, {
        default: (props: AdminListRenderProps<Group> & {groups: Group[]}) =>
          h(
            'ul',
            props.groups.map((group: Group) => h('li', {key: group.id}, group.name)),
          ),
      });

      await vi.waitFor(() => expect(wrapper.findAll('li').map((item) => item.text())).toEqual(['Admins']));
    });

    it('lets a custom form set values and submit them', async () => {
      const {wrapper} = mountWith(BaseGroupCreate, {}, createManagementContext(), {
        default: (props: BaseGroupCreateRenderProps) =>
          h('div', [
            h('input', {
              'aria-label': 'Group name',
              onInput: (event: Event) => props.handleInputChange('name', (event.target as HTMLInputElement).value),
              value: props.values.name,
            }),
            h('button', {disabled: !props.isValid, onClick: props.handleSubmit}, 'Save'),
          ]),
      });

      expect(wrapper.find('button').attributes('disabled')).toBeDefined();
      await wrapper.find('input').setValue('  Engineering ');
      await wrapper.find('button').trigger('click');
      expect(wrapper.emitted('submit')?.[0]).toEqual([{description: undefined, name: 'Engineering'}]);
    });

    it('defaults a custom user form to the first user type and submits non-empty attributes', async () => {
      let renderProps: BaseUserCreateRenderProps | undefined;
      const {wrapper} = mountWith(
        BaseUserCreate,
        {userTypes: [{label: 'Person', value: 'person'}]},
        createManagementContext(),
        {
          default: (props: BaseUserCreateRenderProps) => {
            renderProps = props;

            return h('span', props.type);
          },
        },
      );

      renderProps?.handleInputChange('username', 'jane');
      renderProps?.handleInputChange('email', 'jane@example.com');
      renderProps?.handleInputChange('given_name', ' ');
      await nextTick();
      renderProps?.handleSubmit();
      expect(wrapper.text()).toBe('person');
      expect(wrapper.emitted('submit')?.[0]).toEqual([
        {attributes: {email: 'jane@example.com', username: 'jane'}, type: 'person'},
      ]);
    });

    it('hides credentials from custom user details and offers no delete for read-only users', () => {
      let renderProps: BaseUserDetailsRenderProps | undefined;
      mountWith(
        BaseUserDetails,
        {onDelete: vi.fn(), user: {...users[0], attributes: {password: 'x', username: 'jane'}, isReadOnly: true}},
        createManagementContext(),
        {
          default: (props: BaseUserDetailsRenderProps) => {
            renderProps = props;

            return h('h2', props.displayName);
          },
        },
      );

      expect(renderProps?.attributes).toEqual({username: 'jane'});
      expect(renderProps?.onDelete).toBeUndefined();
    });

    it('hands custom agent details the delete handler for writable agents', () => {
      const onDelete = vi.fn();
      let renderProps: BaseAgentDetailsRenderProps | undefined;
      mountWith(
        BaseAgentDetails,
        {
          agent: {display: 'Concierge', id: 'a1', ouId: 'ou-1', type: 'assistant'},
          onDelete,
          roles: ['viewer'],
        },
        createManagementContext(),
        {
          default: (props: BaseAgentDetailsRenderProps) => {
            renderProps = props;

            return h('span', props.agent?.display);
          },
        },
      );

      renderProps?.onDelete?.();
      expect(onDelete).toHaveBeenCalled();
      expect(renderProps?.roles).toEqual(['viewer']);
    });

    it('hands custom members UI the remove handler and the actions column', async () => {
      const onRemove = vi.fn();
      const member = {display: 'Jane Doe', id: 'u1', type: 'user'};
      const {wrapper} = mountWith(BaseGroupMembers, {members: [member], onRemove}, createManagementContext(), {
        default: (props: BaseGroupMembersRenderProps) =>
          h('div', [
            h('p', props.columns.map((column: {id: string}) => column.id).join(',')),
            h('button', {onClick: () => props.onRemove?.(props.members[0])}, 'Drop'),
          ]),
      });

      expect(wrapper.find('p').text()).toBe('member,type,actions');
      await wrapper.find('button').trigger('click');
      expect(onRemove).toHaveBeenCalledWith(member);
    });

    it('hands custom permissions UI only the granted servers, with their names', () => {
      const {wrapper} = mountWith(
        BaseRolePermissions,
        {
          permissions: [
            {permissions: ['read'], resourceServerId: 'rs-1'},
            {permissions: [], resourceServerId: 'rs-2'},
          ],
          resourceServerNames: {'rs-1': 'Orders API'},
        },
        createManagementContext(),
        {
          default: (props: BaseRolePermissionsRenderProps) =>
            h(
              'ul',
              props.permissions.map((entry: RoleResourcePermissions) =>
                h('li', `${props.resolveResourceServerName(entry.resourceServerId)}: ${entry.permissions.join(' ')}`),
              ),
            ),
        },
      );

      expect(wrapper.findAll('li').map((item) => item.text())).toEqual(['Orders API: read']);
    });
  });

  describe('agent names', () => {
    it('shows the display value, then the name attribute, then the identifier in the agent list', () => {
      const {wrapper} = mountWith(BaseAgentList, {
        agents: [
          {attributes: {name: 'Sync worker'}, display: 'Nightly sync worker', id: 'ag-1', ouId: 'ou-1', type: 'bot'},
          {attributes: {name: 'Billing bot'}, id: 'ag-2', ouId: 'ou-1', type: 'bot'},
          {id: 'ag-3', ouId: 'ou-1', type: 'bot'},
        ],
      });

      const names: string[] = wrapper.findAll('tbody tr').map((row: DOMWrapper<Element>) => row.find('td').text());
      expect(names).toEqual(['Nightly sync worker', 'Billing bot', 'ag-3']);
    });

    it('titles the agent details and asks to delete the agent by its name attribute', async () => {
      const onDelete = vi.fn();
      const {wrapper} = mountWith(BaseAgentDetails, {
        agent: {attributes: {name: 'Billing bot'}, id: 'ag-2', ouId: 'ou-1', type: 'bot'},
        onDelete,
      });

      expect(wrapper.text()).toContain('Billing bot');
      const deleteButton = wrapper
        .findAll('button')
        .find(
          (button: DOMWrapper<HTMLButtonElement>) => button.text() === translate('admin.agents.details.delete.action'),
        );
      await deleteButton!.trigger('click');

      expect(wrapper.find('[role="group"]').attributes('aria-label')).toBe(
        translate('admin.agents.details.delete.confirm', {name: 'Billing bot'}),
      );
    });

    it("shows the owner's ID, or that the agent has none", () => {
      const {wrapper} = mountWith(BaseAgentDetails, {
        agent: {
          id: 'ag-2',
          ouId: 'ou-1',
          owner: {id: 'jane@example.com', idType: 'email', isLocal: false},
          type: 'bot',
        },
      });
      expect(wrapper.text()).toContain('jane@example.com');

      const {wrapper: unowned} = mountWith(BaseAgentDetails, {agent: {id: 'ag-3', ouId: 'ou-1', type: 'bot'}});
      expect(unowned.text()).toContain(translate('admin.agents.details.no_owner'));
    });
  });

  describe('search and filters', () => {
    const lastUrl = (context: ReturnType<typeof createManagementContext>): URL =>
      new URL(context.fetcher.mock.calls[context.fetcher.mock.calls.length - 1][0]);

    it('searches users on the server by the chosen attribute and clears the search', async () => {
      const context = createManagementContext();
      context.fetcher.mockResolvedValue(jsonResponse({count: 0, startIndex: 1, totalResults: 0, users: []}));
      const {wrapper} = mountWith(UserList, {}, context);
      await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalled());

      const form = wrapper.find('form[role="search"]');
      await chooseOption(findAllSelectControls(form)[0], translate('admin.users.list.search.email'));
      await form.find('input').setValue(' ada@example.com ');
      await form.trigger('submit');

      await vi.waitFor(() => expect(lastUrl(context).searchParams.get('filter')).toBe('email eq "ada@example.com"'));
      await vi.waitFor(() =>
        expect(wrapper.text()).toContain(translate('admin.common.search.no_results', {value: 'ada@example.com'})),
      );

      const clear = wrapper
        .findAll('form[role="search"] button')
        .find((button) => button.text() === translate('admin.common.search.clear'));
      await clear!.trigger('click');
      await vi.waitFor(() => expect(lastUrl(context).searchParams.has('filter')).toBe(false));
    });

    it('hides the user search when a fixed filter is given', async () => {
      const context = createManagementContext();
      context.fetcher.mockResolvedValue(jsonResponse({users: []}));
      const {wrapper} = mountWith(UserList, {filter: 'username eq "ada"'}, context);

      await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalled());
      expect(wrapper.find('form[role="search"]').exists()).toBe(false);
      expect(lastUrl(context).searchParams.get('filter')).toBe('username eq "ada"');
    });

    it('searches agents by name', async () => {
      const context = createManagementContext();
      context.fetcher.mockResolvedValue(jsonResponse({agents: [], count: 0, startIndex: 1, totalResults: 0}));
      const {wrapper} = mountWith(AgentList, {}, context);
      await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalled());

      const form = wrapper.find('form[role="search"]');
      await form.find('input').setValue('Concierge');
      await form.trigger('submit');

      await vi.waitFor(() => expect(lastUrl(context).searchParams.get('filter')).toBe('name eq "Concierge"'));
    });

    it('narrows role assignments to one assignee type on the server', async () => {
      const context = createManagementContext();
      context.fetcher.mockResolvedValue(jsonResponse({assignments: [], count: 0, startIndex: 1, totalResults: 0}));
      const {wrapper} = mountWith(RoleAssignments, {roleId: 'r1'}, context);
      await vi.waitFor(() => expect(context.fetcher).toHaveBeenCalled());

      await chooseOption(findAllSelectControls(wrapper)[0], translate('admin.common.identity_types.group'));

      await vi.waitFor(() => expect(lastUrl(context).searchParams.get('type')).toBe('group'));
    });
  });

  describe('applications', () => {
    const application = {
      description: 'Customer portal',
      id: 'app-1',
      inboundAuthConfig: [
        {
          config: {
            clientId: 'portal-client',
            clientSecret: 'stored-secret',
            grantTypes: ['authorization_code', 'refresh_token'],
            redirectUris: ['https://portal.example/callback'],
            responseTypes: ['code'],
          },
          type: 'oauth2',
        },
      ],
      name: 'Portal',
      ouId: 'ou-1',
      template: 'browser',
      url: 'https://portal.example',
    };
    const listPage = {
      applications: [{clientId: 'portal-client', id: 'app-1', name: 'Portal', template: 'browser'}],
      count: 1,
      totalResults: 1,
    };

    const routeApplications =
      (created: unknown = application) =>
      (url: string, init: RequestInit): Promise<Response> => {
        const {pathname} = new URL(url);

        if (init.method === 'DELETE') return Promise.resolve(jsonResponse(null, 204));
        if (init.method === 'POST') return Promise.resolve(jsonResponse(created, 201));
        if (init.method === 'PUT') return Promise.resolve(jsonResponse(JSON.parse(init.body as string)));
        if (pathname === '/applications/app-1') return Promise.resolve(jsonResponse(application));

        return Promise.resolve(jsonResponse(listPage));
      };

    const requestsOf = (context: ManagementTestContext): string[] =>
      context.fetcher.mock.calls.map((call) => {
        const url = new URL(call[0]);

        return `${call[1].method ?? 'GET'} ${url.pathname}${url.search}`;
      });

    const field = (wrapper: {find: (selector: string) => {setValue: (value: string) => Promise<void>}}, name: string) =>
      wrapper.find(`input[name$="-${name}"]`);

    const buttonNamed = (wrapper: {findAll: (selector: string) => {text: () => string}[]}, label: string) =>
      wrapper.findAll('button').find((button) => button.text() === label) as unknown as {
        attributes: (name: string) => string | undefined;
        trigger: (event: string) => Promise<void>;
      };

    it('BaseApplicationList shows each application with its client ID and type', () => {
      const {wrapper} = mountWith(BaseApplicationList, {applications: listPage.applications});

      expect(wrapper.find('caption').text()).toBe(translate('admin.applications.list.title'));
      expect(wrapper.findAll('th').map((th) => th.text())).toEqual([
        translate('admin.applications.list.columns.name'),
        translate('admin.applications.list.columns.client_id'),
        translate('admin.applications.list.columns.type'),
      ]);
      expect(wrapper.find('tbody tr').text()).toContain('portal-client');
      expect(wrapper.find('tbody tr').text()).toContain('browser');
    });

    it('BaseApplicationList shows a translated status column only when the server reports a status', () => {
      const {wrapper} = mountWith(BaseApplicationList, {
        applications: [
          {id: 'app-1', name: 'Portal', status: {value: 'ACTIVE'}},
          {id: 'app-2', name: 'Legacy', status: {value: 'SUSPENDED'}},
        ],
      });

      expect(wrapper.findAll('th').map((th) => th.text())).toContain(
        translate('admin.applications.list.columns.status'),
      );
      const rows = wrapper.findAll('tbody tr');
      expect(rows[0].text()).toContain(translate('admin.applications.status.active'));
      expect(rows[1].text()).toContain(translate('admin.applications.status.suspended'));

      const {wrapper: withoutStatus} = mountWith(BaseApplicationList, {applications: listPage.applications});
      expect(withoutStatus.findAll('th').map((th) => th.text())).not.toContain(
        translate('admin.applications.list.columns.status'),
      );
    });

    it('ApplicationList fetches a page under the applications key and hands it to its slot', async () => {
      const context = createManagementContext();
      context.fetcher.mockImplementation(routeApplications());
      const {wrapper} = mountWith(ApplicationList, {limit: 5}, context, {
        default: (props: AdminListRenderProps<BasicApplication> & {applications: BasicApplication[]}) =>
          h(
            'p',
            `${props.applications.map((row) => row.name).join()} ${props.columns.map((column) => column.id).join()}`,
          ),
      });

      await vi.waitFor(() => expect(wrapper.text()).toBe('Portal name,clientId,type'));
      expect(requestsOf(context)).toEqual(['GET /applications?limit=5&offset=0']);
    });

    it('BaseApplicationCreate needs a redirect URI for the authorization code grant and emits the OAuth basics', async () => {
      const {wrapper} = mountWith(BaseApplicationCreate, {});
      const submit = () => buttonNamed(wrapper, translate('admin.applications.create.submit'));

      await field(wrapper, 'name').setValue(' Portal ');
      expect(submit().attributes('disabled')).toBeDefined();
      await field(wrapper, 'redirectUris').setValue('https://a.example/cb, https://b.example/cb');
      expect(submit().attributes('disabled')).toBeUndefined();
      await wrapper.find('input[name$="-public-client"]').setValue(true);
      await wrapper.find('form').trigger('submit');

      expect(wrapper.emitted('submit')?.[0]).toEqual([
        {
          description: undefined,
          grantTypes: ['authorization_code', 'refresh_token'],
          logoUrl: undefined,
          name: 'Portal',
          publicClient: true,
          redirectUris: ['https://a.example/cb', 'https://b.example/cb'],
          url: undefined,
        },
      ]);

      await wrapper.find('input[name$="-grant-type-client_credentials"]').setValue(true);
      expect(submit().attributes('disabled')).toBeDefined();
    });

    it('BaseApplicationCreate hands its slot the values, setters and grant types', async () => {
      let form: BaseApplicationCreateRenderProps | undefined;
      const {wrapper} = mountWith(BaseApplicationCreate, {}, createManagementContext(), {
        default: (props: BaseApplicationCreateRenderProps) => {
          form = props;

          return h('p', props.grantTypeOptions.map((option) => option.label).join(','));
        },
      });

      expect(wrapper.text()).toBe(
        ['authorization_code', 'refresh_token', 'client_credentials']
          .map((grantType) => translate(`admin.applications.grant_types.${grantType}`))
          .join(','),
      );
      form!.handleInputChange('name', 'Daemon');
      form!.handleGrantTypesChange(['client_credentials']);
      await nextTick();
      expect(form!.isValid).toBe(true);
      form!.handleSubmit();
      expect(wrapper.emitted('submit')?.[0][0]).toMatchObject({grantTypes: ['client_credentials'], name: 'Daemon'});
    });

    it('ApplicationCreate creates the application and shows the returned secret once before emitting created', async () => {
      const context = createManagementContext();
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(
        routeApplications({
          ...application,
          id: 'app-9',
          inboundAuthConfig: [{config: {clientSecret: 's3cr3t', grantTypes: [], responseTypes: []}, type: 'oauth2'}],
        }),
      );
      const {wrapper} = mountWith(ApplicationCreate, {}, context);

      await field(wrapper, 'name').setValue('Portal');
      await field(wrapper, 'redirectUris').setValue('https://p.example/cb');
      await wrapper.find('form').trigger('submit');

      await vi.waitFor(() =>
        expect(wrapper.findAll('input').some((input) => (input.element as HTMLInputElement).value === 's3cr3t')).toBe(
          true,
        ),
      );
      expect(wrapper.emitted('created')).toBeUndefined();
      expect(requestsOf(context)).toEqual(['POST /applications']);
      expect(context.fetcher.mock.calls[0][0]).toBe('https://thunder.example/applications');
      expect(JSON.parse(context.fetcher.mock.calls[0][1].body as string)).toEqual({
        inboundAuthConfig: [
          {
            config: {
              grantTypes: ['authorization_code', 'refresh_token'],
              publicClient: false,
              redirectUris: ['https://p.example/cb'],
              responseTypes: ['code'],
              tokenEndpointAuthMethod: 'client_secret_basic',
            },
            type: 'oauth2',
          },
        ],
        name: 'Portal',
        ouId: 'ou-1',
      });
      expect(invalidatedKeys(invalidate)).toEqual([[ApplicationQueryKeys.APPLICATIONS]]);

      await buttonNamed(wrapper, translate('admin.applications.secret.done')).trigger('click');

      expect(wrapper.emitted('created')?.[0][0]).toMatchObject({id: 'app-9'});
      expect(wrapper.text()).not.toContain('s3cr3t');
      expect((wrapper.find('input[name$="-name"]').element as HTMLInputElement).value).toBe('');
    });

    it('BaseApplicationDetails shows the OAuth configuration without the stored secret and no actions by default', () => {
      const {wrapper} = mountWith(BaseApplicationDetails, {application});

      expect(wrapper.find('h2').text()).toBe('Portal');
      expect(wrapper.find(`ul[aria-label="${translate('admin.applications.fields.redirect_uris')}"]`).text()).toContain(
        'https://portal.example/callback',
      );
      expect(wrapper.html()).not.toContain('stored-secret');
      expect(wrapper.findAll('button').map((button) => button.text())).not.toEqual(
        expect.arrayContaining([
          translate('admin.applications.details.edit.action'),
          translate('admin.applications.details.delete.action'),
          translate('admin.applications.details.secret.action'),
        ]),
      );
    });

    it('BaseApplicationDetails confirms deletion and secret regeneration, and edits the OAuth basics', async () => {
      const onDelete = vi.fn();
      const onRegenerateSecret = vi.fn();
      const onUpdate = vi.fn();
      const {wrapper} = mountWith(BaseApplicationDetails, {application, onDelete, onRegenerateSecret, onUpdate});

      await buttonNamed(wrapper, translate('admin.applications.details.secret.action')).trigger('click');
      expect(onRegenerateSecret).not.toHaveBeenCalled();
      await wrapper.find('[role="group"]').findAll('button')[1].trigger('click');
      expect(onRegenerateSecret).toHaveBeenCalledTimes(1);

      await buttonNamed(wrapper, translate('admin.applications.details.delete.action')).trigger('click');
      const confirm = wrapper
        .findAll('[role="group"]')
        .find(
          (group) =>
            group.attributes('aria-label') === translate('admin.applications.details.delete.confirm', {name: 'Portal'}),
        )!;
      expect(onDelete).not.toHaveBeenCalled();
      await confirm.findAll('button')[1].trigger('click');
      expect(onDelete).toHaveBeenCalledTimes(1);

      await buttonNamed(wrapper, translate('admin.applications.details.edit.action')).trigger('click');
      await field(wrapper, 'name').setValue('Portal 2');
      await wrapper.find('input[name$="-grant-type-refresh_token"]').setValue(false);
      await wrapper.find('form').trigger('submit');
      expect(onUpdate).toHaveBeenCalledWith({
        description: 'Customer portal',
        grantTypes: ['authorization_code'],
        logoUrl: undefined,
        name: 'Portal 2',
        redirectUris: ['https://portal.example/callback'],
        url: 'https://portal.example',
      });
    });

    it('BaseApplicationDetails hands its slot only the allowed actions and never the stored secret', () => {
      let details: BaseApplicationDetailsRenderProps | undefined;
      mountWith(
        BaseApplicationDetails,
        {
          application: {
            ...application,
            inboundAuthConfig: [{config: {grantTypes: [], publicClient: true, responseTypes: []}, type: 'oauth2'}],
          },
          onDelete: vi.fn(),
          onRegenerateSecret: vi.fn(),
        },
        createManagementContext(),
        {
          default: (props: BaseApplicationDetailsRenderProps) => {
            details = props;

            return h('span', props.application?.name);
          },
        },
      );

      expect(details!.onDelete).toBeTypeOf('function');
      expect(details!.onUpdate).toBeUndefined();
      // A public client has no secret to regenerate.
      expect(details!.onRegenerateSecret).toBeUndefined();

      mountWith(
        BaseApplicationDetails,
        {application: {...application, isReadOnly: true}, onDelete: vi.fn()},
        undefined,
        {
          default: (props: BaseApplicationDetailsRenderProps) => {
            details = props;

            return h('span');
          },
        },
      );
      expect(details!.onDelete).toBeUndefined();
      expect(details!.oauth).not.toHaveProperty('clientSecret');
    });

    it('ApplicationDetails loads the application, saves an edit as a full update and invalidates its keys', async () => {
      const context = createManagementContext();
      const keys = subscribedKeysOf(context);
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(routeApplications());
      let details: BaseApplicationDetailsRenderProps | undefined;
      mountWith(ApplicationDetails, {applicationId: 'app-1', editable: true}, context, {
        default: (props: BaseApplicationDetailsRenderProps) => {
          details = props;

          return h('span', props.application?.name);
        },
      });

      await vi.waitFor(() => expect(details?.application?.name).toBe('Portal'));
      expect(keys()).toEqual([[ApplicationQueryKeys.APPLICATION, 'app-1']]);
      expect(requestsOf(context)).toEqual(['GET /applications/app-1']);
      expect(details!.onDelete).toBeUndefined();
      expect(details!.onRegenerateSecret).toBeUndefined();

      details!.onUpdate!({
        grantTypes: ['authorization_code'],
        name: 'Portal 2',
        redirectUris: ['https://portal.example/callback'],
      });

      await vi.waitFor(() => expect(requestsOf(context)).toContain('PUT /applications/app-1'));
      const put = context.fetcher.mock.calls.find((call) => call[1].method === 'PUT')!;
      const {id, ...rest} = application;
      void id;
      expect(JSON.parse(put[1].body as string)).toEqual({
        ...rest,
        description: undefined,
        inboundAuthConfig: [
          {
            ...rest.inboundAuthConfig[0],
            config: {...rest.inboundAuthConfig[0].config, grantTypes: ['authorization_code']},
          },
        ],
        name: 'Portal 2',
        url: undefined,
      });
      await vi.waitFor(() =>
        expect(invalidatedKeys(invalidate)).toEqual([
          [ApplicationQueryKeys.APPLICATION, 'app-1'],
          [ApplicationQueryKeys.APPLICATIONS],
        ]),
      );
    });

    it('ApplicationDetails regenerates the client secret and shows the new one once', async () => {
      const context = createManagementContext();
      context.fetcher.mockImplementation(routeApplications());
      const {wrapper} = mountWith(ApplicationDetails, {applicationId: 'app-1', secretRegenerable: true}, context);

      await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('Portal'));
      await buttonNamed(wrapper, translate('admin.applications.details.secret.action')).trigger('click');
      await wrapper.find('[role="group"]').findAll('button')[1].trigger('click');

      await vi.waitFor(() => expect(requestsOf(context)).toContain('PUT /applications/app-1'));
      const put = context.fetcher.mock.calls.find((call) => call[1].method === 'PUT')!;
      const saved = JSON.parse(put[1].body as string) as Application;
      const secret: string = saved.inboundAuthConfig![0].config.clientSecret!;
      expect(secret).not.toBe('stored-secret');
      await vi.waitFor(() =>
        expect(wrapper.findAll('input').some((input) => (input.element as HTMLInputElement).value === secret)).toBe(
          true,
        ),
      );

      await buttonNamed(wrapper, translate('admin.applications.secret.done')).trigger('click');
      expect(wrapper.findAll('input').some((input) => (input.element as HTMLInputElement).value === secret)).toBe(
        false,
      );
    });

    it('ApplicationDetails deletes through the API and shows translated server errors', async () => {
      const context = createManagementContext();
      const invalidate = vi.spyOn(context.thunderID.invalidator, 'invalidate');
      context.fetcher.mockImplementation(routeApplications());
      const {wrapper} = mountWith(ApplicationDetails, {applicationId: 'app-1', deletable: true}, context);

      await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('Portal'));
      await buttonNamed(wrapper, translate('admin.applications.details.delete.action')).trigger('click');
      await wrapper.find('[role="group"]').findAll('button')[1].trigger('click');

      await vi.waitFor(() => expect(wrapper.emitted('deleted')).toHaveLength(1));
      expect(requestsOf(context)).toContain('DELETE /applications/app-1');
      expect(invalidatedKeys(invalidate)).toEqual([[ApplicationQueryKeys.APPLICATIONS]]);

      const refused = createManagementContext();
      refused.fetcher.mockResolvedValue(jsonResponse({code: 'APP-1', message: 'raw server detail'}, 403));
      const {wrapper: denied} = mountWith(ApplicationDetails, {applicationId: 'app-1'}, refused);

      await vi.waitFor(() => expect(denied.find('[role="alert"]').exists()).toBe(true));
      expect(denied.find('[role="alert"]').text()).toBe(translate('admin.common.errors.forbidden'));
      expect(denied.text()).not.toContain('raw server detail');
    });
  });

  describe('administration flows', () => {
    /**
     * A fetcher that answers like the server: the flow configuration (`configured`, handle by config key),
     * the administration flow listing (one flow per configured handle, with the id `id-<handle>`), flow
     * execution, and the given resources by path.
     */
    const createFlowContext = ({
      configured = {},
      resources = {},
    }: {configured?: Record<string, string>; resources?: Record<string, unknown>} = {}): ManagementTestContext => {
      const context = createManagementContext();
      context.fetcher.mockImplementation((url: string) => {
        const {pathname} = new URL(url);

        if (pathname === '/server-config/flow') {
          return Promise.resolve(
            jsonResponse({
              merged: Object.fromEntries(
                Object.entries(configured).map(([key, handle]) => [key, {defaultHandle: handle}]),
              ),
            }),
          );
        }
        if (pathname === '/flows') {
          return Promise.resolve(
            jsonResponse({
              flows: Object.values(configured).map((handle) => ({
                flowType: 'ADMINISTRATION',
                handle,
                id: `id-${handle}`,
              })),
            }),
          );
        }
        if (pathname === '/flow/execute') {
          return Promise.resolve(jsonResponse({data: {additionalData: {}}, flowStatus: 'COMPLETE'}));
        }
        if (pathname.endsWith('/groups') || pathname.endsWith('/roles')) {
          return Promise.resolve(jsonResponse({count: 0, groups: [], roles: [], startIndex: 1, totalResults: 0}));
        }

        return Promise.resolve(jsonResponse(resources[pathname] ?? {}));
      });

      return context;
    };

    /** The bodies of the flow executions a context's fetcher received, in order. */
    const executions = (context: ManagementTestContext): unknown[] =>
      context.fetcher.mock.calls
        .filter(([url]) => url === 'https://thunder.example/flow/execute')
        .map(([, init]) => JSON.parse(init.body as string) as unknown);

    const lifecycleButton = (
      wrapper: VueWrapper | DOMWrapper<Element>,
      name: string,
    ): DOMWrapper<HTMLButtonElement> | undefined =>
      wrapper.findAll('button').find((button: DOMWrapper<HTMLButtonElement>) => button.text() === name);

    const lockedUser: ManagedUser = {...users[0], status: {value: 'LOCKED'}};

    describe('BaseUserDetails', () => {
      it('shows the translated access status', () => {
        const {wrapper} = mountWith(BaseUserDetails, {user: lockedUser});

        expect(wrapper.text()).toContain(translate('admin.common.status.locked'));
      });

      it('offers no lifecycle actions without a handler', () => {
        const {wrapper} = mountWith(BaseUserDetails, {lifecycleActions: ['unlock', 'suspend'], user: lockedUser});

        expect(lifecycleButton(wrapper, translate('admin.common.lifecycle.unlock'))).toBeUndefined();
        expect(lifecycleButton(wrapper, translate('admin.common.lifecycle.suspend'))).toBeUndefined();
      });

      it('unlocks straight away, and asks for confirmation and an optional note before suspending', async () => {
        const onLifecycleAction = vi.fn();
        const {wrapper} = mountWith(BaseUserDetails, {
          lifecycleActions: ['unlock', 'suspend'],
          onLifecycleAction,
          user: lockedUser,
        });

        await lifecycleButton(wrapper, translate('admin.common.lifecycle.unlock'))!.trigger('click');
        expect(onLifecycleAction).toHaveBeenLastCalledWith('unlock');

        await lifecycleButton(wrapper, translate('admin.common.lifecycle.suspend'))!.trigger('click');
        expect(onLifecycleAction).toHaveBeenCalledTimes(1);
        const confirmation = wrapper.find('[role="group"]');
        expect(confirmation.attributes('aria-label')).toBe(
          translate('admin.common.lifecycle.suspend_confirm', {name: 'Jane Doe'}),
        );
        const note = confirmation.find('input');
        expect(confirmation.find(`label[for="${note.attributes('id')}"]`).text()).toBe(
          translate('admin.common.lifecycle.operator_note'),
        );
        expect(note.attributes('maxlength')).toBe('100');
        await note.setValue(' Ticket 4521 ');
        await lifecycleButton(confirmation, translate('admin.common.lifecycle.suspend'))!.trigger('click');

        expect(onLifecycleAction).toHaveBeenLastCalledWith('suspend', 'Ticket 4521');
      });

      it('hands the default slot the lifecycle actions, for read-only users too', () => {
        const onLifecycleAction = vi.fn();
        let renderProps: BaseUserDetailsRenderProps | undefined;
        mountWith(
          BaseUserDetails,
          {lifecycleActions: ['unlock'], onLifecycleAction, user: {...lockedUser, isReadOnly: true}},
          undefined,
          {
            default: (props: BaseUserDetailsRenderProps) => {
              renderProps = props;

              return h('span', props.displayName);
            },
          },
        );

        expect(renderProps?.lifecycleActions).toEqual(['unlock']);
        expect(renderProps?.onLifecycleAction).toBe(onLifecycleAction);
      });
    });

    describe('UserDetails', () => {
      it('reads no flow configuration unless lifecycle actions are on', async () => {
        const context = createFlowContext({resources: {'/users/u1': lockedUser}});
        const {wrapper} = mountWith(UserDetails, {userId: 'u1'}, context);

        await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('Jane Doe'));
        expect(context.fetcher.mock.calls.some(([url]) => url.includes('/server-config/'))).toBe(false);
      });

      it('says the account actions could not be loaded when the flow configuration cannot be read', async () => {
        const context = createFlowContext({resources: {'/users/u1': lockedUser}});
        const server = context.fetcher.getMockImplementation()!;
        context.fetcher.mockImplementation((url: string, init?: RequestInit) =>
          url.includes('/server-config/') ? Promise.resolve(new Response('{}', {status: 500})) : server(url, init),
        );
        const {wrapper} = mountWith(UserDetails, {lifecycleActions: true, userId: 'u1'}, context);

        await vi.waitFor(() =>
          expect(wrapper.find('[role="alert"]').text()).toBe(translate('admin.common.lifecycle.load_error')),
        );
        expect(lifecycleButton(wrapper, translate('admin.common.lifecycle.unlock'))).toBeUndefined();
      });

      it('offers only the actions whose flow is configured, and runs one through its flow', async () => {
        const context = createFlowContext({
          configured: {userUnlockFlow: 'unlock-user'},
          resources: {'/users/u1': lockedUser},
        });
        const {wrapper} = mountWith(UserDetails, {lifecycleActions: true, userId: 'u1'}, context);

        await vi.waitFor(() =>
          expect(lifecycleButton(wrapper, translate('admin.common.lifecycle.unlock'))).toBeDefined(),
        );
        expect(lifecycleButton(wrapper, translate('admin.common.lifecycle.suspend'))).toBeUndefined();
        await lifecycleButton(wrapper, translate('admin.common.lifecycle.unlock'))!.trigger('click');

        await vi.waitFor(() =>
          expect(executions(context)).toEqual([{flowId: 'id-unlock-user', inputs: {subject: 'u1'}}]),
        );
      });

      it('deletes through the user deletion flow in flow mode', async () => {
        const context = createFlowContext({
          configured: {userDeletionFlow: 'delete-user'},
          resources: {'/users/u1': users[0]},
        });
        const {wrapper} = mountWith(UserDetails, {administrationMode: 'flow', deletable: true, userId: 'u1'}, context);

        await vi.waitFor(() =>
          expect(lifecycleButton(wrapper, translate('admin.users.details.delete.action'))).toBeDefined(),
        );
        await lifecycleButton(wrapper, translate('admin.users.details.delete.action'))!.trigger('click');
        await lifecycleButton(wrapper.find('[role="group"]'), translate('admin.common.actions.confirm'))!.trigger(
          'click',
        );

        await vi.waitFor(() => expect(wrapper.emitted('deleted')).toHaveLength(1));
        expect(executions(context)).toEqual([{flowId: 'id-delete-user', inputs: {subject: 'u1'}}]);
        expect(context.fetcher.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
      });
    });

    it('removes a group member through the membership removal flow in flow mode', async () => {
      const context = createFlowContext({
        configured: {groupMembershipRemovalFlow: 'remove-member'},
        resources: {
          '/groups/g-1/members': {
            count: 1,
            members: [{display: 'Jane Doe', id: 'u1', type: 'user'}],
            startIndex: 1,
            totalResults: 1,
          },
        },
      });
      const {wrapper} = mountWith(GroupMembers, {administrationMode: 'flow', editable: true, groupId: 'g-1'}, context);
      const removeLabel: string = translate('admin.groups.members.remove_label', {name: 'Jane Doe'});

      await vi.waitFor(() => expect(wrapper.find(`button[aria-label="${removeLabel}"]`).exists()).toBe(true));
      await wrapper.find(`button[aria-label="${removeLabel}"]`).trigger('click');

      await vi.waitFor(() => expect(executions(context)).toHaveLength(1));
      expect(context.fetcher.mock.calls.some(([url]) => url.endsWith('/members/remove'))).toBe(false);
    });

    it('unsuspends an agent through its flow', async () => {
      const context = createFlowContext({
        configured: {agentSuspendFlow: 'suspend-agent', agentUnsuspendFlow: 'unsuspend-agent'},
        resources: {
          '/agents/a-1': {
            attributes: {name: 'Billing bot'},
            id: 'a-1',
            ouId: 'ou-1',
            status: {value: 'SUSPENDED'},
            type: 'bot',
          },
        },
      });
      const {wrapper} = mountWith(AgentDetails, {agentId: 'a-1', lifecycleActions: true}, context);

      await vi.waitFor(() =>
        expect(lifecycleButton(wrapper, translate('admin.common.lifecycle.unsuspend'))).toBeDefined(),
      );
      expect(wrapper.text()).toContain(translate('admin.common.status.suspended'));
      expect(lifecycleButton(wrapper, translate('admin.common.lifecycle.suspend'))).toBeUndefined();
      await lifecycleButton(wrapper, translate('admin.common.lifecycle.unsuspend'))!.trigger('click');
      const confirmation = wrapper.find('[role="group"]');
      expect(confirmation.attributes('aria-label')).toBe(
        translate('admin.common.lifecycle.unsuspend_confirm', {name: 'Billing bot'}),
      );
      await lifecycleButton(confirmation, translate('admin.common.lifecycle.unsuspend'))!.trigger('click');

      await vi.waitFor(() =>
        expect(executions(context)).toEqual([{flowId: 'id-unsuspend-agent', inputs: {subject: 'a-1'}}]),
      );
    });

    it('suspends an application without asking for an operator note', async () => {
      const context = createFlowContext({
        configured: {applicationSuspendFlow: 'suspend-app'},
        resources: {'/applications/app-1': {id: 'app-1', name: 'Portal', status: {value: 'ACTIVE'}}},
      });
      const {wrapper} = mountWith(ApplicationDetails, {applicationId: 'app-1', lifecycleActions: true}, context);

      await vi.waitFor(() =>
        expect(lifecycleButton(wrapper, translate('admin.common.lifecycle.suspend'))).toBeDefined(),
      );
      await lifecycleButton(wrapper, translate('admin.common.lifecycle.suspend'))!.trigger('click');
      const confirmation = wrapper.find('[role="group"]');
      expect(confirmation.attributes('aria-label')).toBe(
        translate('admin.common.lifecycle.suspend_confirm', {name: 'Portal'}),
      );
      expect(confirmation.find('input').exists()).toBe(false);
      await lifecycleButton(confirmation, translate('admin.common.lifecycle.suspend'))!.trigger('click');

      await vi.waitFor(() =>
        expect(executions(context)).toEqual([{flowId: 'id-suspend-app', inputs: {subject: 'app-1'}}]),
      );
    });
  });
  describe('administrator-initiated email verification', () => {
    const person: ManagedUser = {
      attributes: {email: 'jane@example.com', given_name: 'Jane', mobile: '+94770000001'},
      display: 'Jane Doe',
      id: 'u7',
      ouId: 'ou-1',
      type: 'Person',
      verifiedAttributes: {},
    };
    const verifiedPerson: ManagedUser = {...person, verifiedAttributes: {email: {verifiedAt: '2026-11-03T10:00:00Z'}}};
    const linkSent: unknown = {
      data: {additionalData: {channel: 'email', emailSent: 'true', maskedDestination: 'j***@example.com'}},
      flowStatus: 'INCOMPLETE',
      type: 'VIEW',
    };
    const send: string = translate('admin.users.details.verification.verify');

    const button = (wrapper: VueWrapper, name: string): DOMWrapper<HTMLButtonElement> | undefined =>
      wrapper.findAll('button').find((candidate: DOMWrapper<HTMLButtonElement>) => candidate.text() === name);

    /**
     * A context serving the user, no groups, the given answer to a flow start, and the `flow` server config
     * naming the verification flow (`null` leaves it unset).
     */
    const createServer = (
      user: ManagedUser,
      start: () => Response = () => jsonResponse(linkSent),
      configuredHandle: string | null = 'admin-verify',
    ) => {
      const context = createManagementContext();
      context.fetcher.mockImplementation((url: string) => {
        const {pathname} = new URL(url);
        if (pathname === '/server-config/flow') {
          return Promise.resolve(
            jsonResponse({
              merged: configuredHandle ? {adminAttributeVerificationFlow: {defaultHandle: configuredHandle}} : {},
            }),
          );
        }
        if (pathname === '/user-types') {
          return Promise.resolve(jsonResponse({count: 1, totalResults: 1, types: [{handle: user.type, id: 'type-1'}]}));
        }
        if (pathname === '/user-types/type-1') {
          return Promise.resolve(
            jsonResponse({
              handle: user.type,
              schema: {
                email: {type: 'email'},
                mobile: {type: 'mobile'},
                mobile_number: {type: 'mobile'},
                workEmail: {type: 'email'},
              },
            }),
          );
        }
        if (url === 'https://thunder.example/flow/execute') return Promise.resolve(start());
        if (url.includes('/groups')) {
          return Promise.resolve(jsonResponse({count: 0, groups: [], startIndex: 1, totalResults: 0}));
        }

        return Promise.resolve(jsonResponse(user));
      });

      return context;
    };

    const configReads = (context: ManagementTestContext): number =>
      context.fetcher.mock.calls.filter(([url]) => url.endsWith('/server-config/flow')).length;

    const flowStarts = (context: ManagementTestContext): unknown[] =>
      context.fetcher.mock.calls
        .filter(([url]) => url === 'https://thunder.example/flow/execute')
        .map(([, init]) => JSON.parse(init.body as string) as unknown);

    describe('BaseUserDetails', () => {
      it('shows the email as not verified and sends a link for it', async () => {
        const onSendVerification = vi.fn();
        const {wrapper} = mountWith(BaseUserDetails, {onSendVerification, user: person});

        expect(wrapper.find('dd .thunderid-admin__status-chip').text()).toBe(
          translate('admin.users.details.verification.status.unverified'),
        );
        expect(wrapper.find('dd .thunderid-admin__status-chip--warning svg').exists()).toBe(true);
        expect(wrapper.findAll('button').filter((candidate) => candidate.text() === send)).toHaveLength(1);
        await button(wrapper, send)!.trigger('click');

        expect(onSendVerification).toHaveBeenCalledWith('email');
      });

      it('names the attribute in each send action for assistive technology', () => {
        const {wrapper} = mountWith(BaseUserDetails, {
          onSendVerification: vi.fn(),
          user: {...person, attributes: {email: 'jane@example.com', workEmail: 'work@example.com'}},
          userSchema: {email: {type: 'email'}, workEmail: {type: 'email'}},
        });

        expect(wrapper.findAll('button').map((candidate) => candidate.attributes('aria-label'))).toEqual(
          expect.arrayContaining([`${send} email`, `${send} workEmail`]),
        );
      });

      it('shows the spinner only on the row being sent', async () => {
        const {wrapper} = mountWith(BaseUserDetails, {
          onSendVerification: vi.fn(),
          user: {...person, attributes: {email: 'jane@example.com', workEmail: 'work@example.com'}},
          userSchema: {email: {type: 'email'}, workEmail: {type: 'email'}},
        });
        const byLabel = (label: string): DOMWrapper<Element> => wrapper.find(`button[aria-label="${label}"]`);

        await byLabel(`${send} workEmail`).trigger('click');
        await wrapper.setProps({isSendingVerification: true});

        expect(byLabel(`${send} workEmail`).classes()).toContain('thunderid-button--loading');
        expect(byLabel(`${send} email`).classes()).not.toContain('thunderid-button--loading');
        expect(byLabel(`${send} email`).attributes('disabled')).toBeDefined();
      });

      it('shows a verified email as verified, with nothing to send', () => {
        const {wrapper} = mountWith(BaseUserDetails, {onSendVerification: vi.fn(), user: verifiedPerson});

        expect(wrapper.find('dd .thunderid-admin__status-chip--success').text()).toBe(
          translate('admin.users.details.verification.status.verified'),
        );
        expect(button(wrapper, send)).toBeUndefined();
      });

      it.each<[string, Record<string, unknown>]>([
        ['the app has not turned it on', {user: person}],
        ['the user is read-only', {onSendVerification: vi.fn(), user: {...person, isReadOnly: true}}],
      ])('offers no send when %s, but still shows the status', (_label, props) => {
        const {wrapper} = mountWith(BaseUserDetails, props);

        expect(wrapper.text()).toContain(translate('admin.users.details.verification.status.unverified'));
        expect(button(wrapper, send)).toBeUndefined();
      });

      it('shows no status when the server does not report verification', () => {
        const {wrapper} = mountWith(BaseUserDetails, {
          onSendVerification: vi.fn(),
          user: {...person, verifiedAttributes: undefined},
        });

        expect(wrapper.text()).not.toContain(translate('admin.users.details.verification.status.unverified'));
        expect(button(wrapper, send)).toBeUndefined();
      });

      it.each<[string, Record<string, unknown>, string]>([
        [
          'the masked destination',
          {channel: 'email', maskedDestination: 'j***@example.com'},
          translate('admin.users.details.verification.sent', {destination: 'j***@example.com'}),
        ],
        ['no destination', {channel: 'email'}, translate('admin.users.details.verification.sent_generic')],
      ])('confirms a sent link with %s', (_label, sentVerification, message) => {
        const {wrapper} = mountWith(BaseUserDetails, {onSendVerification: vi.fn(), sentVerification, user: person});

        expect(wrapper.find('[role="alert"]').text()).toBe(message);
      });

      it.each([{isSendingVerification: true}, {isUpdating: true}])('disables send while busy (%j)', (busy) => {
        const {wrapper} = mountWith(BaseUserDetails, {
          ...busy,
          onSendVerification: vi.fn(),
          user: person,
        });

        expect(button(wrapper, send)!.element.disabled).toBe(true);
      });

      it('hands the scoped slot the verification state and the send action', () => {
        const onSendVerification = vi.fn();
        const sentVerification = {channel: 'email', maskedDestination: 'j***@example.com'};
        let renderProps: BaseUserDetailsRenderProps | undefined;
        mountWith(
          BaseUserDetails,
          {isSendingVerification: true, onSendVerification, sentVerification, user: person},
          undefined,
          {
            default: (props: BaseUserDetailsRenderProps) => {
              renderProps = props;
              return h('span', 'custom');
            },
          },
        );

        expect(renderProps).toMatchObject({
          isSendingVerification: true,
          sentVerification,
          verifiableAttributes: ['email'],
          verifiedAttributes: {},
        });
        renderProps!.onSendVerification!('email');
        expect(onSendVerification).toHaveBeenCalledWith('email');
      });

      it('withholds the send from the scoped slot for a read-only user', () => {
        let renderProps: BaseUserDetailsRenderProps | undefined;
        mountWith(
          BaseUserDetails,
          {onSendVerification: vi.fn(), user: {...verifiedPerson, isReadOnly: true}},
          undefined,
          {
            default: (props: BaseUserDetailsRenderProps) => {
              renderProps = props;
              return h('span', 'custom');
            },
          },
        );

        expect(renderProps!.onSendVerification).toBeUndefined();
        expect(renderProps!.verifiedAttributes).toEqual({email: {verifiedAt: '2026-11-03T10:00:00Z'}});
      });
    });

    describe('UserDetails', () => {
      it('offers no send unless attribute verification is on', async () => {
        const {wrapper} = mountWith(UserDetails, {userId: 'u7'}, createServer(person));

        await vi.waitFor(() =>
          expect(wrapper.text()).toContain(translate('admin.users.details.verification.status.unverified')),
        );
        expect(button(wrapper, send)).toBeUndefined();
      });

      it('starts the administrator-initiated flow and shows where the link went', async () => {
        const context = createServer(person);
        const {wrapper} = mountWith(UserDetails, {attributeVerification: true, userId: 'u7'}, context);

        await vi.waitFor(() => expect(button(wrapper, send)).toBeDefined());
        await button(wrapper, send)!.trigger('click');

        await vi.waitFor(() =>
          expect(wrapper.text()).toContain(
            translate('admin.users.details.verification.sent', {destination: 'j***@example.com'}),
          ),
        );
        expect(flowStarts(context)).toEqual([
          {
            flowType: 'ADMIN_INITIATED',
            handle: 'admin-verify',
            inputs: {attribute: 'email', subject: 'u7'},
            verbose: true,
          },
        ]);
        expect(configReads(context)).toBe(1);
      });

      it('offers no send when the server names no verification flow', async () => {
        const context = createServer(person, undefined, null);
        const {wrapper} = mountWith(UserDetails, {attributeVerification: true, userId: 'u7'}, context);

        await vi.waitFor(() =>
          expect(wrapper.text()).toContain(translate('admin.users.details.verification.status.unverified')),
        );
        await vi.waitFor(() => expect(configReads(context)).toBe(1));
        await Promise.all(context.fetcher.mock.results.map((result) => result.value));
        await flushPromises();
        expect(button(wrapper, send)).toBeUndefined();
        expect(flowStarts(context)).toEqual([]);
      });

      it('offers no send, and says verification could not be loaded, when the server configuration cannot be read', async () => {
        const context = createServer(person);
        const server = context.fetcher.getMockImplementation()!;
        context.fetcher.mockImplementation((url: string, init?: RequestInit) =>
          url.endsWith('/server-config/flow') ? Promise.resolve(new Response('{}', {status: 500})) : server(url, init),
        );
        const {wrapper} = mountWith(UserDetails, {attributeVerification: true, userId: 'u7'}, context);

        await vi.waitFor(() =>
          expect(wrapper.text()).toContain(translate('admin.users.details.verification.status.unverified')),
        );
        await vi.waitFor(() => expect(configReads(context)).toBeGreaterThan(0));
        await Promise.allSettled(context.fetcher.mock.results.map((result) => result.value));
        await flushPromises();
        await vi.waitFor(() =>
          expect(wrapper.find('[role="alert"]').text()).toBe(translate('admin.users.details.verification.load_error')),
        );
        expect(button(wrapper, send)).toBeUndefined();
      });

      it('offers no send, and says verification could not be loaded, when the user type cannot be read', async () => {
        const context = createServer(person);
        const server = context.fetcher.getMockImplementation()!;
        context.fetcher.mockImplementation((url: string, init?: RequestInit) =>
          new URL(url).pathname === '/user-types'
            ? Promise.resolve(new Response('{}', {status: 500}))
            : server(url, init),
        );
        const {wrapper} = mountWith(UserDetails, {attributeVerification: true, userId: 'u7'}, context);

        await vi.waitFor(() =>
          expect(wrapper.find('[role="alert"]').text()).toBe(translate('admin.users.details.verification.load_error')),
        );
        expect(button(wrapper, send)).toBeUndefined();
      });

      it('reads no server configuration or user types unless attribute verification is on', async () => {
        const context = createServer(person);
        const {wrapper} = mountWith(UserDetails, {userId: 'u7'}, context);

        await vi.waitFor(() =>
          expect(wrapper.text()).toContain(translate('admin.users.details.verification.status.unverified')),
        );
        await Promise.all(context.fetcher.mock.results.map((result) => result.value));
        await flushPromises();
        expect(
          context.fetcher.mock.calls.some(([url]) => url.includes('/server-config/') || url.includes('/user-types')),
        ).toBe(false);
      });

      it('sends to a schema-defined work email and shows a verified mobile number', async () => {
        const user = {
          ...person,
          attributes: {mobile_number: '+94770000001', workEmail: 'work@example.com'},
          verifiedAttributes: {mobile_number: {verifiedAt: '2026-11-06T10:00:00Z'}},
        };
        const context = createServer(user);
        const {wrapper} = mountWith(UserDetails, {attributeVerification: true, userId: user.id}, context);

        await vi.waitFor(() => expect(button(wrapper, send)).toBeDefined());
        expect(
          wrapper.find('dd .thunderid-admin__status-chip--success').element.previousElementSibling?.textContent,
        ).toBe('+94770000001');
        await button(wrapper, send)!.trigger('click');
        expect(flowStarts(context)).toEqual([
          expect.objectContaining({inputs: {attribute: 'workEmail', subject: user.id}}),
        ]);
      });

      it.each<[string, () => Response, string]>([
        [
          'a refused step',
          () => jsonResponse({error: {code: 'FET-1114', message: {defaultValue: 'Suspended'}}, flowStatus: 'ERROR'}),
          translate('admin.users.details.verification.error'),
        ],
        [
          'an email that was not sent',
          () =>
            jsonResponse({data: {additionalData: {channel: 'email', emailSent: 'false'}}, flowStatus: 'INCOMPLETE'}),
          translate('admin.users.details.verification.error'),
        ],
        [
          'a token without the permission',
          () => jsonResponse({code: 'FES-1019'}, 403),
          translate('admin.common.errors.forbidden'),
        ],
      ])('shows a translated message for %s', async (_label, start, message) => {
        const {wrapper} = mountWith(
          UserDetails,
          {attributeVerification: true, userId: 'u7'},
          createServer(person, start),
        );

        await vi.waitFor(() => expect(button(wrapper, send)).toBeDefined());
        await button(wrapper, send)!.trigger('click');

        await vi.waitFor(() => expect(wrapper.find('[role="alert"]').text()).toBe(message));
      });
    });
  });
});
