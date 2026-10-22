// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Group, ManagedUser, RoleResourcePermissions} from '@thunderid/browser';
import {mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {h, nextTick} from 'vue';
import BaseAgentDetails from '../../components/presentation/admin/AgentDetails/BaseAgentDetails';
import AgentList from '../../components/presentation/admin/AgentList/AgentList';
import type {BaseAgentDetailsRenderProps} from '../../components/presentation/admin/AgentDetails/BaseAgentDetails';
import BaseGroupCreate from '../../components/presentation/admin/GroupCreate/BaseGroupCreate';
import type {BaseGroupCreateRenderProps} from '../../components/presentation/admin/GroupCreate/BaseGroupCreate';
import GroupList from '../../components/presentation/admin/GroupList/GroupList';
import BaseGroupMembers from '../../components/presentation/admin/GroupMembers/BaseGroupMembers';
import type {BaseGroupMembersRenderProps} from '../../components/presentation/admin/GroupMembers/BaseGroupMembers';
import RoleCreate from '../../components/presentation/admin/RoleCreate/RoleCreate';
import RoleAssignments from '../../components/presentation/admin/RoleAssignments/RoleAssignments';
import BaseRolePermissions from '../../components/presentation/admin/RolePermissions/BaseRolePermissions';
import type {BaseRolePermissionsRenderProps} from '../../components/presentation/admin/RolePermissions/BaseRolePermissions';
import type {AdminListRenderProps} from '../../components/presentation/admin/shared/createAdminList';
import BaseUserCreate from '../../components/presentation/admin/UserCreate/BaseUserCreate';
import type {BaseUserCreateRenderProps} from '../../components/presentation/admin/UserCreate/BaseUserCreate';
import BaseUserDetails from '../../components/presentation/admin/UserDetails/BaseUserDetails';
import type {BaseUserDetailsRenderProps} from '../../components/presentation/admin/UserDetails/BaseUserDetails';
import UserDetails from '../../components/presentation/admin/UserDetails/UserDetails';
import BaseUserList from '../../components/presentation/admin/UserList/BaseUserList';
import UserList from '../../components/presentation/admin/UserList/UserList';
import {createManagementContext, jsonResponse, translate} from '../helpers/managementContext';
import {chooseOption, findAllSelectControls} from '../helpers/selectControl';

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
      context.fetcher.mockResolvedValue(jsonResponse({id: 'r1', name: 'Auditor', ouId: 'ou-1', permissions: []}, 201));
      const {wrapper} = mountWith(RoleCreate, {}, context);

      await wrapper.findAll('input')[0].setValue('Auditor');
      await wrapper.find('form').trigger('submit');

      await vi.waitFor(() => expect(wrapper.emitted('created')).toHaveLength(1));
      expect(context.fetcher.mock.calls[0][0]).toBe('https://thunder.example/roles');
      expect(JSON.parse(context.fetcher.mock.calls[0][1].body as string)).toEqual({name: 'Auditor', ouId: 'ou-1'});
      expect(wrapper.emitted('created')![0][0]).toMatchObject({id: 'r1'});
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
        {agent: {id: 'a1', name: 'Concierge', ouId: 'ou-1', type: 'assistant'}, onDelete, roles: ['viewer']},
        createManagementContext(),
        {
          default: (props: BaseAgentDetailsRenderProps) => {
            renderProps = props;

            return h('span', props.agent?.name);
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

  describe('search and filters', () => {
    const lastUrl = (context: ReturnType<typeof createManagementContext>): URL =>
      new URL(context.fetcher.mock.calls[context.fetcher.mock.calls.length - 1][0] as string);

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
});
