// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  AgentCreate,
  AgentDetails,
  AgentList,
  BaseAgentCreate,
  BaseAgentDetails,
  BaseAgentList,
  BaseGroupCreate,
  BaseGroupList,
  BaseGroupMembers,
  BaseRoleAssignments,
  BaseRoleCreate,
  BaseRoleList,
  BaseRolePermissions,
  BaseUserCreate,
  BaseUserDetails,
  BaseUserList,
  GroupCreate,
  GroupList,
  GroupMembers,
  RoleAssignments,
  RoleCreate,
  RoleList,
  RolePermissions,
  UserCreate,
  UserDetails,
  UserList,
} from '@thunderid/nextjs';
import {Attribution} from '@thunderid/react';
import type {
  BasicAgent,
  Group,
  GroupMember,
  ManagedUser,
  MembershipGroup,
  RoleAssignment,
  RoleSummary,
} from '@thunderid/react';
import {ReactElement, ReactNode} from 'react';
import {DataTableStory, NeedsId, SelectableList} from './AdminParts';
import {bool, fromReact, isLive, jsx, num, omit, str} from './helpers';
import Narrow from './Narrow';
import type {Action, Args, ComponentDef, PropControl, StoryDef} from './types';

// Sample data for the Base components. Nothing here reaches a server.

const OU = 'ou_9d1e07';

const SAMPLE_USERS: ManagedUser[] = [
  {
    attributes: {email: 'liam.chen@acme.io', given_name: 'Liam', username: 'liam.chen'},
    display: 'Liam Chen',
    id: 'usr_8f2c41',
    ouId: OU,
    type: 'customer',
  },
  {
    attributes: {email: 'ana.silva@acme.io', given_name: 'Ana', username: 'ana.silva'},
    display: 'Ana Silva',
    id: 'usr_31b7e0',
    ouId: OU,
    type: 'employee',
  },
];

const SAMPLE_GROUPS: Group[] = [
  {description: 'Everyone who can sign in to the console', id: 'grp_admins', name: 'Administrators', ouId: OU},
  {description: 'Support desk', id: 'grp_support', name: 'Support', ouId: OU},
];

const SAMPLE_MEMBERSHIPS: MembershipGroup[] = SAMPLE_GROUPS.map(({id, name, ouId}: Group) => ({id, name, ouId}));

const SAMPLE_MEMBERS: GroupMember[] = [
  {display: 'Liam Chen', id: 'usr_8f2c41', type: 'user'},
  {display: 'Support', id: 'grp_support', type: 'group'},
  {display: 'Triage bot', id: 'agt_triage', type: 'agent'},
];

const SAMPLE_ROLES: RoleSummary[] = [
  {description: 'Manages users and groups', id: 'rol_admin', name: 'Admin', ouId: OU},
  {description: 'Reads users', id: 'rol_viewer', isReadOnly: true, name: 'Viewer', ouId: OU},
];

const SAMPLE_ASSIGNMENTS: RoleAssignment[] = [
  {display: 'Liam Chen', id: 'usr_8f2c41', type: 'user'},
  {display: 'Administrators', id: 'grp_admins', type: 'group'},
  {display: 'Triage bot', id: 'agt_triage', type: 'agent'},
];

const SAMPLE_AGENTS: BasicAgent[] = [
  {description: 'Routes support tickets', id: 'agt_triage', name: 'Triage bot', ouId: OU, type: 'assistant'},
  {description: 'Reconciles invoices', id: 'agt_ledger', name: 'Ledger', ouId: OU, type: 'worker'},
];

const SAMPLE_TYPES = [
  {label: 'Customer', value: 'customer'},
  {label: 'Employee', value: 'employee'},
];

const SAMPLE_AGENT_TYPES = [
  {label: 'Assistant', value: 'assistant'},
  {label: 'Worker', value: 'worker'},
];

const CANDIDATES = {
  agent: [{id: 'agt_ledger', label: 'Ledger'}],
  group: [{id: 'grp_support', label: 'Support'}],
  user: [{id: 'usr_31b7e0', label: 'Ana Silva'}],
};

const ADMIN_SOURCE: PropControl = {
  control: ['base', 'live'],
  description:
    'base renders the presentational Base component, re-exported from @thunderid/nextjs, with sample data; live renders the connected component, whose management requests go through the SDK server action with the server-held session.',
  name: 'source',
  type: "'base' | 'live' (playground only)",
};

const TITLE: PropControl = {
  control: 'text',
  description: 'Heading; empty uses the translated default.',
  name: 'title',
  type: 'string',
};
const LIMIT: PropControl = {control: 'number', description: 'Rows per page.', name: 'limit', type: 'number'};
const EDITABLE: PropControl = {
  control: 'bool',
  description: 'Allows changes from this view (live only).',
  name: 'editable',
  type: 'boolean',
};
const DELETABLE: PropControl = {
  control: 'bool',
  description: 'Shows the delete action (live only).',
  name: 'deletable',
  type: 'boolean',
};

const idControl = (name: string, from: string): PropControl => ({
  control: 'text',
  description: `Identifier to load (live only). Select one in ${from} and copy it from Actions.`,
  name,
  type: 'string',
});

const STORIES: StoryDef[] = [
  {id: 'base', name: 'Sample data'},
  {args: {source: 'live'}, id: 'live', name: 'Live (signed in)'},
];

interface AdminSpec {
  /** Props passed only to the Base component in the snippet. */
  baseExtra: string[];
  controls: PropControl[];
  defaults: Args;
  id: string;
  /** Props passed only to the live component in the snippet. */
  liveExtra: string[];
  /** Controls the Base component ignores, left out of its snippet. */
  liveOnly?: string[];
  name: string;
  renderBase: (args: Args, action: Action) => ReactNode;
  renderLive: (args: Args, action: Action) => ReactNode;
  width?: number;
}

const admin = ({
  baseExtra,
  controls,
  defaults,
  id,
  liveExtra,
  liveOnly = [],
  name,
  renderBase,
  renderLive,
  width = 640,
}: AdminSpec): ComponentDef => ({
  code: (args: Args) =>
    isLive(args)
      ? {imports: [name], jsx: jsx(name, omit(args, 'source'), {defaults: omit(defaults, 'source'), extra: liveExtra})}
      : {
          imports: [`Base${name}`],
          jsx: jsx(`Base${name}`, omit(args, 'source', ...liveOnly), {
            defaults: omit(defaults, 'source'),
            extra: baseExtra,
          }),
        },
  controls: [ADMIN_SOURCE, ...controls],
  defaults: {source: 'base', ...defaults},
  group: 'Admin',
  id: id.toLowerCase(),
  live: true,
  name,
  render: (args: Args, action: Action) => (
    <Narrow width={width}>{isLive(args) ? renderLive(args, action) : renderBase(args, action)}</Narrow>
  ),
  stories: STORIES,
});

const text = (args: Args, key: string): string | undefined => str(args, key) || undefined;

const listBaseExtra = (rows: string): string[] => [
  `${rows}={${rows}}`,
  'totalResults={total}',
  'onSelect={handleSelect}',
];

export const ADMIN_COMPONENTS: ComponentDef[] = [
  admin({
    baseExtra: listBaseExtra('users'),
    controls: [
      TITLE,
      LIMIT,
      {control: 'text', description: 'Server-side filter (live only).', name: 'filter', type: 'string'},
    ],
    defaults: {filter: '', limit: 20, title: ''},
    id: 'UserList',
    liveExtra: ['onSelect={(user) => setUserId(user.id)}'],
    liveOnly: ['filter'],
    name: 'UserList',
    renderBase: (args: Args, action: Action) => (
      <SelectableList>
        {(selected: string | undefined, select: (rowId: string) => void) => (
          <BaseUserList
            title={text(args, 'title')}
            limit={num(args, 'limit') || undefined}
            offset={0}
            totalResults={SAMPLE_USERS.length}
            users={SAMPLE_USERS}
            selectedUserId={selected}
            onSelect={(user: ManagedUser) => {
              select(user.id);
              action('onSelect', user.id);
            }}
            onPageChange={(offset: number) => action('onPageChange', String(offset))}
          />
        )}
      </SelectableList>
    ),
    renderLive: (args: Args, action: Action) => (
      <UserList
        title={text(args, 'title')}
        limit={num(args, 'limit') || undefined}
        filter={text(args, 'filter')}
        onSelect={(user: ManagedUser) => action('onSelect', user.id)}
      />
    ),
  }),
  admin({
    baseExtra: ['userTypes={userTypes}', 'onSubmit={handleSubmit}'],
    controls: [
      TITLE,
      {
        control: ['api', 'invite'],
        description: 'Create directly, or send an invite (live only).',
        name: 'mode',
        type: "'api' | 'invite'",
      },
    ],
    defaults: {mode: 'api', title: ''},
    id: 'UserCreate',
    liveExtra: ['onCreated={handleCreated}'],
    liveOnly: ['mode'],
    name: 'UserCreate',
    renderBase: (args: Args, action: Action) => (
      <BaseUserCreate
        title={text(args, 'title')}
        userTypes={SAMPLE_TYPES}
        onSubmit={(user: {type: string}) => action('onSubmit', `type ${user.type}`)}
        onCancel={() => action('onCancel')}
      />
    ),
    renderLive: (args: Args, action: Action) => (
      <UserCreate
        title={text(args, 'title')}
        mode={str(args, 'mode') as 'api'}
        onCreated={(user: ManagedUser) => action('onCreated', user.id)}
        onCancel={() => action('onCancel')}
      />
    ),
  }),
  admin({
    baseExtra: ['user={user}', 'groups={groups}', 'onUpdate={handleUpdate}', 'onDelete={handleDelete}'],
    controls: [idControl('userId', 'UserList'), EDITABLE, DELETABLE],
    defaults: {deletable: false, editable: false, userId: ''},
    id: 'UserDetails',
    liveExtra: ['onDeleted={handleDeleted}'],
    liveOnly: ['userId', 'editable', 'deletable'],
    name: 'UserDetails',
    renderBase: (_args: Args, action: Action) => (
      <BaseUserDetails
        user={SAMPLE_USERS[0]}
        groups={SAMPLE_MEMBERSHIPS}
        onUpdate={(attributes: Record<string, unknown>) => action('onUpdate', JSON.stringify(attributes))}
        onDelete={() => action('onDelete')}
      />
    ),
    renderLive: (args: Args, action: Action) =>
      str(args, 'userId') ? (
        <UserDetails
          key={str(args, 'userId')}
          userId={str(args, 'userId')}
          editable={bool(args, 'editable')}
          deletable={bool(args, 'deletable')}
          onDeleted={() => action('onDeleted')}
        />
      ) : (
        <NeedsId name="userId" from="UserList" />
      ),
  }),
  admin({
    baseExtra: listBaseExtra('groups'),
    controls: [TITLE, LIMIT],
    defaults: {limit: 20, title: ''},
    id: 'GroupList',
    liveExtra: ['onSelect={(group) => setGroupId(group.id)}'],
    name: 'GroupList',
    renderBase: (args: Args, action: Action) => (
      <SelectableList>
        {(selected: string | undefined, select: (rowId: string) => void) => (
          <BaseGroupList
            title={text(args, 'title')}
            limit={num(args, 'limit') || undefined}
            offset={0}
            totalResults={SAMPLE_GROUPS.length}
            groups={SAMPLE_GROUPS}
            selectedGroupId={selected}
            onSelect={(group: Group) => {
              select(group.id);
              action('onSelect', group.id);
            }}
          />
        )}
      </SelectableList>
    ),
    renderLive: (args: Args, action: Action) => (
      <GroupList
        title={text(args, 'title')}
        limit={num(args, 'limit') || undefined}
        onSelect={(group: Group) => action('onSelect', group.id)}
      />
    ),
  }),
  admin({
    baseExtra: ['onSubmit={handleSubmit}'],
    controls: [TITLE],
    defaults: {title: ''},
    id: 'GroupCreate',
    liveExtra: ['onCreated={handleCreated}'],
    name: 'GroupCreate',
    renderBase: (args: Args, action: Action) => (
      <BaseGroupCreate
        title={text(args, 'title')}
        onSubmit={(group: {name: string}) => action('onSubmit', `name "${group.name}"`)}
        onCancel={() => action('onCancel')}
      />
    ),
    renderLive: (args: Args, action: Action) => (
      <GroupCreate
        title={text(args, 'title')}
        onCreated={(group: Group) => action('onCreated', group.id)}
        onCancel={() => action('onCancel')}
      />
    ),
  }),
  admin({
    baseExtra: ['members={members}', 'candidates={candidates}', 'onAdd={handleAdd}', 'onRemove={handleRemove}'],
    controls: [idControl('groupId', 'GroupList'), EDITABLE],
    defaults: {editable: true, groupId: ''},
    id: 'GroupMembers',
    liveExtra: [],
    liveOnly: ['groupId', 'editable'],
    name: 'GroupMembers',
    renderBase: (_args: Args, action: Action) => (
      <BaseGroupMembers
        members={SAMPLE_MEMBERS}
        candidates={CANDIDATES}
        onAdd={(member: {id: string; type: string}) => action('onAdd', `${member.type} ${member.id}`)}
        onRemove={(member: GroupMember) => action('onRemove', `${member.type} ${member.id}`)}
      />
    ),
    renderLive: (args: Args) =>
      str(args, 'groupId') ? (
        <GroupMembers key={str(args, 'groupId')} groupId={str(args, 'groupId')} editable={bool(args, 'editable')} />
      ) : (
        <NeedsId name="groupId" from="GroupList" />
      ),
  }),
  admin({
    baseExtra: listBaseExtra('roles'),
    controls: [TITLE, LIMIT],
    defaults: {limit: 20, title: ''},
    id: 'RoleList',
    liveExtra: ['onSelect={(role) => setRoleId(role.id)}'],
    name: 'RoleList',
    renderBase: (args: Args, action: Action) => (
      <SelectableList>
        {(selected: string | undefined, select: (rowId: string) => void) => (
          <BaseRoleList
            title={text(args, 'title')}
            limit={num(args, 'limit') || undefined}
            offset={0}
            totalResults={SAMPLE_ROLES.length}
            roles={SAMPLE_ROLES}
            selectedRoleId={selected}
            onSelect={(role: RoleSummary) => {
              select(role.id);
              action('onSelect', role.id);
            }}
          />
        )}
      </SelectableList>
    ),
    renderLive: (args: Args, action: Action) => (
      <RoleList
        title={text(args, 'title')}
        limit={num(args, 'limit') || undefined}
        onSelect={(role: RoleSummary) => action('onSelect', role.id)}
      />
    ),
  }),
  admin({
    baseExtra: ['onSubmit={handleSubmit}'],
    controls: [TITLE],
    defaults: {title: ''},
    id: 'RoleCreate',
    liveExtra: ['onCreated={handleCreated}'],
    name: 'RoleCreate',
    renderBase: (args: Args, action: Action) => (
      <BaseRoleCreate
        title={text(args, 'title')}
        onSubmit={(role: {name: string}) => action('onSubmit', `name "${role.name}"`)}
        onCancel={() => action('onCancel')}
      />
    ),
    renderLive: (args: Args, action: Action) => (
      <RoleCreate
        title={text(args, 'title')}
        onCreated={(role: RoleSummary) => action('onCreated', role.id)}
        onCancel={() => action('onCancel')}
      />
    ),
  }),
  admin({
    baseExtra: [
      'assignments={assignments}',
      'candidates={candidates}',
      'onAssign={handleAssign}',
      'onUnassign={handleUnassign}',
    ],
    controls: [idControl('roleId', 'RoleList'), EDITABLE],
    defaults: {editable: true, roleId: ''},
    id: 'RoleAssignments',
    liveExtra: [],
    liveOnly: ['roleId', 'editable'],
    name: 'RoleAssignments',
    renderBase: (_args: Args, action: Action) => (
      <BaseRoleAssignments
        assignments={SAMPLE_ASSIGNMENTS}
        candidates={CANDIDATES}
        onAssign={(assignment: {id: string; type: string}) => action('onAssign', `${assignment.type} ${assignment.id}`)}
        onUnassign={(assignment: RoleAssignment) => action('onUnassign', `${assignment.type} ${assignment.id}`)}
      />
    ),
    renderLive: (args: Args) =>
      str(args, 'roleId') ? (
        <RoleAssignments key={str(args, 'roleId')} roleId={str(args, 'roleId')} editable={bool(args, 'editable')} />
      ) : (
        <NeedsId name="roleId" from="RoleList" />
      ),
  }),
  admin({
    baseExtra: ['permissions={permissions}', 'resourceServerNames={names}'],
    controls: [idControl('roleId', 'RoleList')],
    defaults: {roleId: ''},
    id: 'RolePermissions',
    liveExtra: [],
    liveOnly: ['roleId'],
    name: 'RolePermissions',
    renderBase: () => (
      <BaseRolePermissions
        permissions={[
          {permissions: ['system:user:view', 'system:group'], resourceServerId: 'rs_system'},
          {permissions: ['orders:read'], resourceServerId: 'rs_orders'},
        ]}
        resourceServerNames={{rs_orders: 'Orders API', rs_system: 'System'}}
      />
    ),
    renderLive: (args: Args) =>
      str(args, 'roleId') ? (
        <RolePermissions key={str(args, 'roleId')} roleId={str(args, 'roleId')} />
      ) : (
        <NeedsId name="roleId" from="RoleList" />
      ),
  }),
  admin({
    baseExtra: listBaseExtra('agents'),
    controls: [TITLE, LIMIT],
    defaults: {limit: 20, title: ''},
    id: 'AgentList',
    liveExtra: ['onSelect={(agent) => setAgentId(agent.id)}'],
    name: 'AgentList',
    renderBase: (args: Args, action: Action) => (
      <SelectableList>
        {(selected: string | undefined, select: (rowId: string) => void) => (
          <BaseAgentList
            title={text(args, 'title')}
            limit={num(args, 'limit') || undefined}
            offset={0}
            totalResults={SAMPLE_AGENTS.length}
            agents={SAMPLE_AGENTS}
            selectedAgentId={selected}
            onSelect={(agent: BasicAgent) => {
              select(agent.id);
              action('onSelect', agent.id);
            }}
          />
        )}
      </SelectableList>
    ),
    renderLive: (args: Args, action: Action) => (
      <AgentList
        title={text(args, 'title')}
        limit={num(args, 'limit') || undefined}
        onSelect={(agent: BasicAgent) => action('onSelect', agent.id)}
      />
    ),
  }),
  admin({
    baseExtra: ['agentTypes={agentTypes}', 'onSubmit={handleSubmit}'],
    controls: [TITLE],
    defaults: {title: ''},
    id: 'AgentCreate',
    liveExtra: ['onCreated={handleCreated}'],
    name: 'AgentCreate',
    renderBase: (args: Args, action: Action) => (
      <BaseAgentCreate
        title={text(args, 'title')}
        agentTypes={SAMPLE_AGENT_TYPES}
        onSubmit={(agent: {name: string; type: string}) => action('onSubmit', `${agent.type} "${agent.name}"`)}
        onCancel={() => action('onCancel')}
      />
    ),
    renderLive: (args: Args, action: Action) => (
      <AgentCreate
        title={text(args, 'title')}
        onCreated={(agent: {id: string}) => action('onCreated', agent.id)}
        onCancel={() => action('onCancel')}
      />
    ),
  }),
  admin({
    baseExtra: ['agent={agent}', 'groups={groups}', 'roles={roles}', 'onDelete={handleDelete}'],
    controls: [idControl('agentId', 'AgentList'), DELETABLE],
    defaults: {agentId: '', deletable: false},
    id: 'AgentDetails',
    liveExtra: ['onDeleted={handleDeleted}'],
    liveOnly: ['agentId', 'deletable'],
    name: 'AgentDetails',
    renderBase: (_args: Args, action: Action) => (
      <BaseAgentDetails
        agent={{...SAMPLE_AGENTS[0], clientId: 'triage-bot', owner: 'usr_8f2c41'}}
        groups={SAMPLE_MEMBERSHIPS.slice(1)}
        roles={['Viewer']}
        onDelete={() => action('onDelete')}
      />
    ),
    renderLive: (args: Args, action: Action) =>
      str(args, 'agentId') ? (
        <AgentDetails
          key={str(args, 'agentId')}
          agentId={str(args, 'agentId')}
          deletable={bool(args, 'deletable')}
          onDeleted={() => action('onDeleted')}
        />
      ) : (
        <NeedsId name="agentId" from="AgentList" />
      ),
  }),
  {
    code: (args: Args) =>
      fromReact({
        imports: ['DataTable'],
        jsx: jsx(
          'DataTable',
          {caption: str(args, 'caption'), emptyText: 'No groups'},
          {
            extra: [
              'columns={columns}',
              'rows={rows}',
              'getRowId={(row) => row.id}',
              ...(bool(args, 'isLoading') ? ['isLoading'] : []),
              ...(str(args, 'error') ? [`error="${str(args, 'error')}"`] : []),
              ...(bool(args, 'selectable') ? ['onRowClick={handleRowClick}'] : []),
              ...(bool(args, 'paginated') ? ['pagination={{limit, offset, onChange: setOffset, total}}'] : []),
            ],
          },
        ),
      }),
    controls: [
      {control: 'text', description: 'Accessible name of the table.', name: 'caption', type: 'string'},
      {control: 'bool', description: 'Shows the loading state.', name: 'isLoading', type: 'boolean'},
      {control: 'text', description: 'Error message; replaces the rows.', name: 'error', type: 'string | null'},
      {control: 'bool', description: 'Rows are selectable (onRowClick).', name: 'selectable', type: 'boolean'},
      {control: 'bool', description: 'Offset pagination with one row per page.', name: 'paginated', type: 'boolean'},
      {control: 'bool', description: 'No rows: shows emptyText.', name: 'empty', type: 'boolean (playground only)'},
    ],
    defaults: {caption: 'Groups', empty: false, error: '', isLoading: false, paginated: false, selectable: true},
    group: 'Admin',
    id: 'datatable',
    name: 'DataTable',
    render: (args: Args, action: Action) => <DataTableStory args={args} action={action} />,
    stories: [
      {id: 'default', name: 'Selectable rows'},
      {args: {paginated: true}, id: 'paginated', name: 'Paginated'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {empty: true, selectable: false}, id: 'empty', name: 'Empty'},
      {args: {error: 'You do not have permission to view groups.'}, id: 'error', name: 'Error'},
    ],
  },
  {
    code: (args: Args) =>
      fromReact({
        imports: ['Attribution'],
        jsx: jsx('Attribution', args, {defaults: {appearance: 'inline', variant: 'secured'}}),
      }),
    controls: [
      {
        control: ['inline', 'ribbon'],
        description: 'A line of text, or a ribbon off the edge of a card.',
        name: 'appearance',
        type: "'inline' | 'ribbon'",
      },
      {
        control: ['secured', 'powered'],
        description: 'The words before the wordmark.',
        name: 'variant',
        type: "'powered' | 'secured'",
      },
      {control: 'text', description: 'Makes the credit a link (new tab).', name: 'href', type: 'string'},
    ],
    defaults: {appearance: 'inline', href: '', variant: 'secured'},
    group: 'Admin',
    id: 'attribution',
    name: 'Attribution',
    render: (args: Args) => {
      const credit: ReactElement = (
        <Attribution
          appearance={str(args, 'appearance') as 'inline'}
          variant={str(args, 'variant') as 'secured'}
          href={text(args, 'href')}
        />
      );

      // The ribbon hangs off the right edge of a `position: relative` card.
      return str(args, 'appearance') === 'ribbon' ? (
        <div
          style={{
            border: '1px solid rgba(127,127,127,0.35)',
            borderRadius: 12,
            height: 160,
            position: 'relative',
            width: 320,
          }}
        >
          {credit}
        </div>
      ) : (
        credit
      );
    },
    stories: [
      {id: 'inline', name: 'Inline'},
      {args: {variant: 'powered'}, id: 'powered', name: 'Powered by'},
      {args: {appearance: 'ribbon', variant: 'powered'}, id: 'ribbon', name: 'Ribbon on a card'},
    ],
  },
];
