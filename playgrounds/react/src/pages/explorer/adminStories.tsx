// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AccessStatusValue,
  type AccountLifecycleAction,
  type AdministrationMode,
  type Agent,
  AgentCreate,
  AgentDetails,
  AgentList,
  type Application,
  ApplicationCreate,
  type ApplicationCreateSubmission,
  ApplicationDetails,
  ApplicationList,
  type ApplicationUpdateSubmission,
  Attribution,
  BaseAgentCreate,
  BaseAgentDetails,
  BaseAgentList,
  BaseApplicationCreate,
  BaseApplicationDetails,
  BaseApplicationList,
  BaseGroupCreate,
  BaseGroupDetails,
  BaseGroupList,
  BaseRoleCreate,
  BaseRoleDetails,
  BaseRoleList,
  BaseRolePermissions,
  BaseUserCreate,
  BaseUserDetails,
  BaseUserList,
  type BasicAgent,
  type BasicApplication,
  Card,
  type Group,
  GroupCreate,
  GroupDetails,
  GroupList,
  GroupMembers,
  type ManagedUser,
  RoleAssignments,
  RoleCreate,
  RoleDetails,
  RoleList,
  RolePermissions,
  type RoleSummary,
  UserCreate,
  UserDetails,
  UserList,
  getAccountLifecycleActions,
  getAgentName,
} from '@thunderid/react';
import {ReactElement} from 'react';
import {
  RESOURCE_SERVER_NAMES,
  SAMPLE_AGENT,
  SAMPLE_AGENTS,
  SAMPLE_APPLICATION,
  SAMPLE_APPLICATIONS,
  SAMPLE_GROUPS,
  SAMPLE_MEMBERSHIPS,
  SAMPLE_PERMISSIONS,
  SAMPLE_ROLES,
  SAMPLE_USERS,
  TYPE_OPTIONS,
} from './adminSamples';
import {
  DataTableStory,
  GroupMembersStory,
  Paged,
  RequiresId,
  RoleAssignmentsStory,
  RolePermissionsStory,
  SampleSearch,
} from './AdminStoryWidgets';
import {withCustomStory} from './customRenderStories';
import {bool, jsx, num, SOURCE_CONTROL, str} from './storyHelpers';
import {Narrow} from './StoryWidgets';
import type {Action, Args, ComponentDef, PropControl, Snippet} from './types';

/**
 * Every user lifecycle flow configured, so the sample offers whatever its status allows.
 */
const ALL_USER_LIFECYCLE_FLOWS: Record<string, string> = {
  userSuspendFlow: 'user-suspend',
  userUnlockFlow: 'user-unlock',
  userUnsuspendFlow: 'user-unsuspend',
};

const isLive = (args: Args): boolean => str(args, 'source') === 'live';

const pick = (args: Args, ...keys: string[]): Args =>
  Object.fromEntries(Object.entries(args).filter(([key]: [string, unknown]) => keys.includes(key)));

/* Shared controls. */

const TITLE: PropControl = {
  control: 'text',
  description: 'Heading; empty uses the translated default.',
  name: 'title',
  type: 'string',
};
const DESCRIPTION: PropControl = {
  control: 'text',
  description: 'Text under the heading.',
  name: 'description',
  type: 'string',
};
const LIMIT: PropControl = {control: 'number', description: 'Rows per page.', name: 'limit', type: 'number'};
const LOADING: PropControl = {
  control: 'bool',
  description: 'Base only: shows the loading row.',
  name: 'isLoading',
  type: 'boolean',
};
const ERROR: PropControl = {
  control: 'text',
  description: 'Base only: error shown above the table.',
  name: 'error',
  type: 'string | null',
};
const EMPTY: PropControl = {
  control: 'bool',
  description: 'Base only: renders with no rows (playground only).',
  name: 'empty',
  type: 'boolean',
};
const SELECTABLE: PropControl = {
  control: 'bool',
  description: 'Passes onSelect, which makes rows choosable (playground toggle).',
  name: 'selectable',
  type: '(row) => void',
};
const OU_ID: PropControl = {
  control: 'text',
  description: 'Live only: organization unit; empty uses the signed-in user ouId.',
  name: 'ouId',
  type: 'string',
};

const idControl = (name: string): PropControl => ({
  control: 'text',
  description: `Live only: the ${name.replace(/Id$/, '')} to load. Copy one from the list story or the Hooks page.`,
  name,
  type: 'string',
});

const LIST_DEFAULTS: Args = {
  description: '',
  empty: false,
  error: '',
  isLoading: false,
  limit: 3,
  selectable: true,
  source: 'base',
  title: '',
};

const listStories = (live: string): ComponentDef['stories'] => [
  {id: 'base', name: 'Sample data'},
  {args: {isLoading: true}, id: 'loading', name: 'Loading'},
  {args: {empty: true}, id: 'empty', name: 'Empty'},
  {args: {error: 'You do not have permission to view this.'}, id: 'error', name: 'Error'},
  {args: {limit: 20, source: 'live'}, id: 'live', name: live},
];
const baseListProps = (
  args: Args,
): {description?: string; error: string | null; isLoading: boolean; limit: number; title?: string} => ({
  description: str(args, 'description') || undefined,
  error: str(args, 'error') || null,
  isLoading: bool(args, 'isLoading'),
  limit: Math.max(1, num(args, 'limit')),
  title: str(args, 'title') || undefined,
});

const liveListProps = (
  args: Args,
  action: Action,
): {description?: string; limit: number; onSelect?: (row: {id: string}) => void; title?: string} => ({
  description: str(args, 'description') || undefined,
  limit: Math.max(1, num(args, 'limit')),
  onSelect: bool(args, 'selectable') ? (row: {id: string}) => action('onSelect', row.id) : undefined,
  title: str(args, 'title') || undefined,
});

const listCode = (args: Args, tag: string, rowsProp: string, selectedProp: string): Snippet => {
  const shown: Args = pick(args, 'title', 'description', 'limit');
  const onSelect: string[] = bool(args, 'selectable') ? [`onSelect={(row) => navigate(row.id)}`] : [];

  if (isLive(args)) return {imports: [tag], jsx: jsx(tag, shown, {defaults: {limit: 20}, extra: onSelect})};

  return {
    imports: [`Base${tag}`],
    jsx: jsx(
      `Base${tag}`,
      {...shown, ...pick(args, 'isLoading', 'error')},
      {
        defaults: {limit: 20},
        extra: [
          `${rowsProp}={data.${rowsProp}}`,
          'totalResults={data.totalResults}',
          'offset={offset}',
          'onPageChange={setOffset}',
          ...(tag === 'UserList' || tag === 'AgentList'
            ? ['searchAttributes={searchAttributes}', 'search={search}', 'onSearch={setSearch}']
            : []),
          ...(bool(args, 'selectable') ? [`${selectedProp}={selectedId}`, ...onSelect] : []),
        ],
      },
    ),
  };
};

const LIST_CONTROLS: PropControl[] = [SOURCE_CONTROL, TITLE, DESCRIPTION, LIMIT, SELECTABLE, LOADING, ERROR, EMPTY];
const STORIES: ComponentDef[] = [
  {
    code: (args: Args) => ({
      imports: ['DataTable'],
      jsx: jsx('DataTable', pick(args, 'caption', 'emptyText', 'isLoading', 'error'), {
        extra: [
          'columns={columns}',
          'rows={rows}',
          'getRowId={(row) => row.id}',
          ...(bool(args, 'clickable')
            ? ['selectedRowId={selectedId}', 'onRowClick={(row) => setSelectedId(row.id)}']
            : []),
          ...(bool(args, 'paginate')
            ? [`pagination={{limit: ${num(args, 'limit')}, offset, total, onChange: setOffset}}`]
            : []),
        ],
      }),
    }),
    controls: [
      {control: 'text', description: 'Accessible table caption (visually hidden).', name: 'caption', type: 'string'},
      {control: 'text', description: 'Shown when there are no rows.', name: 'emptyText', type: 'string'},
      {control: 'bool', description: 'Shows a loading row instead of data.', name: 'isLoading', type: 'boolean'},
      {control: 'text', description: 'Error shown above the table.', name: 'error', type: 'string | null'},
      {
        control: 'bool',
        description: 'Passes onRowClick, making rows choosable.',
        name: 'clickable',
        type: '(row) => void',
      },
      {
        control: 'bool',
        description: 'Passes pagination; the footer shows when total > limit.',
        name: 'paginate',
        type: 'DataTablePagination',
      },
      {control: 'number', description: 'pagination.limit.', name: 'limit', type: 'number'},
      {control: 'bool', description: 'Renders with no rows (playground only).', name: 'empty', type: 'boolean'},
    ],
    defaults: {
      caption: 'Active sessions',
      clickable: true,
      emptyText: 'No active sessions.',
      empty: false,
      error: '',
      isLoading: false,
      limit: 2,
      paginate: true,
    },
    group: 'Primitives',
    id: 'datatable',
    name: 'DataTable',
    render: (args: Args, action: Action) => <DataTableStory args={args} action={action} />,
    stories: [
      {id: 'playground', name: 'Paginated, clickable'},
      {args: {clickable: false, paginate: false}, id: 'static', name: 'Static'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {empty: true}, id: 'empty', name: 'Empty'},
      {args: {error: 'Could not load sessions.'}, id: 'error', name: 'Error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Attribution'],
      jsx: jsx('Attribution', args, {defaults: {appearance: 'inline', variant: 'secured'}}),
    }),
    controls: [
      {
        control: ['secured', 'powered'],
        description: '"Secured by" or "Powered by".',
        name: 'variant',
        type: "'secured' | 'powered'",
      },
      {
        control: ['inline', 'ribbon'],
        description: 'inline sits in a footer; ribbon hangs off the right edge of a position: relative card.',
        name: 'appearance',
        type: "'inline' | 'ribbon'",
      },
      {control: 'text', description: 'Makes the mark a link (opens in a new tab).', name: 'href', type: 'string'},
    ],
    defaults: {appearance: 'inline', href: '', variant: 'secured'},
    group: 'Branding',
    id: 'attribution',
    name: 'Attribution',
    render: (args: Args) => {
      const mark: ReactElement = (
        <Attribution
          appearance={str(args, 'appearance') as 'inline'}
          variant={str(args, 'variant') as 'secured'}
          href={str(args, 'href') || undefined}
        />
      );

      if (str(args, 'appearance') !== 'ribbon') return mark;

      return (
        <div style={{paddingRight: 40}}>
          <Narrow width={340}>
            <div style={{position: 'relative'}}>
              <Card variant="outlined">
                <Card.Header>
                  <Card.Title>Sign in</Card.Title>
                  <Card.Description>The ribbon hangs off this card&apos;s right edge.</Card.Description>
                </Card.Header>
                <Card.Content>
                  <div style={{height: 120}} />
                </Card.Content>
              </Card>
              {mark}
            </div>
          </Narrow>
        </div>
      );
    },
    stories: [
      {id: 'secured', name: 'Secured by (inline)'},
      {args: {variant: 'powered'}, id: 'powered', name: 'Powered by'},
      {args: {href: 'https://thunderid.dev'}, id: 'link', name: 'As a link'},
      {args: {appearance: 'ribbon'}, id: 'ribbon', name: 'Ribbon on a card'},
    ],
  },
  {
    code: (args: Args) => {
      const snippet: Snippet = listCode(args, 'UserList', 'users', 'selectedUserId');

      return isLive(args) && str(args, 'filter')
        ? {
            ...snippet,
            jsx: jsx('UserList', pick(args, 'title', 'description', 'limit', 'filter'), {defaults: {limit: 20}}),
          }
        : snippet;
    },
    controls: [
      ...LIST_CONTROLS,
      {
        control: 'text',
        description: 'Live only: SCIM-style filter, e.g. username sw "a".',
        name: 'filter',
        type: 'string',
      },
    ],
    defaults: {...LIST_DEFAULTS, filter: ''},
    group: 'Admin: users',
    id: 'userlist',
    live: true,
    name: 'UserList',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <Narrow width={720}>
          <UserList {...liveListProps(args, action)} filter={str(args, 'filter') || undefined} />
        </Narrow>
      ) : (
        <SampleSearch<ManagedUser>
          action={action}
          attributes={[
            {label: 'Username', value: 'username'},
            {label: 'Email', value: 'email'},
          ]}
          rows={SAMPLE_USERS}
          valueOf={(user: ManagedUser, attribute: string) => user.attributes?.[attribute]}
          render={({onSearch, rows: matching, search, searchAttributes}) => (
            <Paged<ManagedUser>
              key={JSON.stringify(search)}
              args={args}
              action={action}
              rows={matching}
              getId={(user: ManagedUser) => user.id}
              render={({offset, onPageChange, onSelect, rows, selectedId, total}) => (
                <BaseUserList
                  {...baseListProps(args)}
                  users={rows}
                  totalResults={total}
                  offset={offset}
                  onPageChange={onPageChange}
                  onSelect={onSelect}
                  selectedUserId={selectedId}
                  search={search}
                  searchAttributes={searchAttributes}
                  onSearch={onSearch}
                />
              )}
            />
          )}
        />
      ),
    stories: listStories('Live (GET /users)'),
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['UserCreate'],
            jsx: jsx('UserCreate', pick(args, 'title', 'mode', 'ouId'), {
              defaults: {mode: 'api'},
              extra: ['onCreated={handleCreated}'],
            }),
          }
        : {
            imports: ['BaseUserCreate'],
            jsx: jsx('BaseUserCreate', pick(args, 'title', 'isSubmitting', 'error'), {
              extra: ['userTypes={userTypeOptions}', 'onSubmit={handleSubmit}', 'onCancel={close}'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      TITLE,
      {
        control: 'bool',
        description: 'Base only: disables the form while saving.',
        name: 'isSubmitting',
        type: 'boolean',
      },
      ERROR,
      {
        control: ['api', 'invite'],
        description: 'Live only: create through the API, or render <InviteUser />.',
        name: 'mode',
        type: "'api' | 'invite'",
      },
      OU_ID,
    ],
    defaults: {error: '', isSubmitting: false, mode: 'api', ouId: '', source: 'base', title: ''},
    group: 'Admin: users',
    id: 'usercreate',
    live: true,
    name: 'UserCreate',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <Narrow width={480}>
          <UserCreate
            title={str(args, 'title') || undefined}
            mode={str(args, 'mode') as 'api'}
            ouId={str(args, 'ouId') || undefined}
            onCreated={(user: ManagedUser) => action('onCreated', user.id)}
            onCancel={() => action('onCancel')}
          />
        </Narrow>
      ) : (
        <Narrow width={480}>
          <BaseUserCreate
            title={str(args, 'title') || undefined}
            userTypes={TYPE_OPTIONS.user}
            isSubmitting={bool(args, 'isSubmitting')}
            error={str(args, 'error') || null}
            onSubmit={(user: {attributes: Record<string, string>; type: string}) =>
              action(
                'onSubmit',
                JSON.stringify({
                  ...user,
                  attributes: {...user.attributes, password: user.attributes['password'] ? '•••' : undefined},
                }),
              )
            }
            onCancel={() => action('onCancel')}
          />
        </Narrow>
      ),
    stories: [
      {id: 'base', name: 'Sample user types'},
      {args: {isSubmitting: true}, id: 'submitting', name: 'Submitting'},
      {args: {error: 'A user with this username already exists.'}, id: 'error', name: 'Error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (POST /users, writes)'},
      {args: {mode: 'invite', source: 'live'}, id: 'invite', name: 'Live invite mode'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['UserDetails'],
            jsx: jsx(
              'UserDetails',
              pick(
                args,
                'userId',
                'editable',
                'deletable',
                'lifecycleActions',
                'attributeVerification',
                'administrationMode',
              ),
              {extra: ['onDeleted={backToList}']},
            ),
          }
        : {
            imports: ['BaseUserDetails'],
            jsx: jsx('BaseUserDetails', pick(args, 'isLoading', 'error'), {
              extra: [
                'user={user}',
                'groups={groups}',
                ...(bool(args, 'editable') ? ['onUpdate={saveAttributes}'] : []),
                ...(bool(args, 'deletable') ? ['onDelete={deleteUser}'] : []),
                ...(bool(args, 'lifecycleActions')
                  ? ['lifecycleActions={lifecycleActions}', 'onLifecycleAction={runLifecycleAction}']
                  : []),
                ...(bool(args, 'attributeVerification')
                  ? ['onSendVerification={sendVerificationLink}', 'sentVerification={sentVerification}']
                  : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      idControl('userId'),
      {control: 'bool', description: 'Allows editing string attributes (onUpdate).', name: 'editable', type: 'boolean'},
      {control: 'bool', description: 'Shows the delete button (onDelete).', name: 'deletable', type: 'boolean'},
      {
        control: 'bool',
        description: 'Offers suspend, unsuspend and unlock through the configured administration flows.',
        name: 'lifecycleActions',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: "Offers a verification link for the user's unverified email (onSendVerification).",
        name: 'attributeVerification',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: "Whether the sample user's email is verified (base only).",
        name: 'emailVerified',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: 'Shows the message for a sent verification link (sentVerification, base only).',
        name: 'linkSent',
        type: 'boolean',
      },
      {
        control: ['ACTIVE', 'LOCKED', 'SUSPENDED'],
        description: "The sample user's access status, which decides the lifecycle actions offered (base only).",
        name: 'status',
        type: "'ACTIVE' | 'LOCKED' | 'SUSPENDED'",
      },
      {
        control: ['native', 'flow'],
        description: 'How the delete runs: the management API, or the configured user deletion flow (live only).',
        name: 'administrationMode',
        type: "'native' | 'flow'",
      },
      LOADING,
      ERROR,
    ],
    defaults: {
      administrationMode: 'native',
      attributeVerification: true,
      deletable: true,
      editable: true,
      emailVerified: false,
      error: '',
      isLoading: false,
      lifecycleActions: true,
      linkSent: false,
      source: 'base',
      status: 'LOCKED',
      userId: '',
    },
    group: 'Admin: users',
    id: 'userdetails',
    live: true,
    name: 'UserDetails',
    render: (args: Args, action: Action) => {
      if (isLive(args)) {
        if (!str(args, 'userId')) return <RequiresId name="userId" />;

        return (
          <Narrow width={560}>
            <UserDetails
              userId={str(args, 'userId')}
              editable={bool(args, 'editable')}
              deletable={bool(args, 'deletable')}
              lifecycleActions={bool(args, 'lifecycleActions')}
              attributeVerification={bool(args, 'attributeVerification')}
              administrationMode={str(args, 'administrationMode') as AdministrationMode}
              onDeleted={() => action('onDeleted')}
            />
          </Narrow>
        );
      }

      const status: AccessStatusValue = str(args, 'status') as AccessStatusValue;

      return (
        <Narrow width={560}>
          <BaseUserDetails
            user={{
              ...SAMPLE_USERS[0],
              status: {value: status},
              verifiedAttributes: bool(args, 'emailVerified') ? {email: {verifiedAt: '2026-11-03T10:00:00Z'}} : {},
            }}
            onSendVerification={
              bool(args, 'attributeVerification')
                ? (attribute: string) => action('onSendVerification', attribute)
                : undefined
            }
            sentVerification={
              bool(args, 'linkSent') ? {channel: 'email', emailSent: true, maskedDestination: 'l•••@acme.io'} : null
            }
            lifecycleActions={getAccountLifecycleActions('user', status, ALL_USER_LIFECYCLE_FLOWS)}
            onLifecycleAction={
              bool(args, 'lifecycleActions')
                ? (lifecycleAction: AccountLifecycleAction, operatorNote?: string) =>
                    action('onLifecycleAction', operatorNote ? `${lifecycleAction}: ${operatorNote}` : lifecycleAction)
                : undefined
            }
            groups={SAMPLE_MEMBERSHIPS}
            isLoading={bool(args, 'isLoading')}
            error={str(args, 'error') || null}
            onUpdate={
              bool(args, 'editable')
                ? (attributes: Record<string, unknown>) => action('onUpdate', JSON.stringify(attributes))
                : undefined
            }
            onDelete={bool(args, 'deletable') ? () => action('onDelete', SAMPLE_USERS[0].id) : undefined}
          />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Sample user'},
      {
        args: {attributeVerification: false, deletable: false, editable: false, lifecycleActions: false},
        id: 'readonly',
        name: 'Read only',
      },
      {args: {linkSent: true}, id: 'verification-sent', name: 'Verification link sent'},
      {args: {emailVerified: true}, id: 'email-verified', name: 'Email verified'},
      {args: {status: 'SUSPENDED'}, id: 'suspended', name: 'Suspended'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs userId)'},
      {args: {administrationMode: 'flow', source: 'live'}, id: 'live-flows', name: 'Live through administration flows'},
    ],
  },
  {
    code: (args: Args) => listCode(args, 'GroupList', 'groups', 'selectedGroupId'),
    controls: LIST_CONTROLS,
    defaults: LIST_DEFAULTS,
    group: 'Admin: groups',
    id: 'grouplist',
    live: true,
    name: 'GroupList',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <Narrow width={720}>
          <GroupList {...liveListProps(args, action)} />
        </Narrow>
      ) : (
        <Paged<Group>
          args={args}
          action={action}
          rows={SAMPLE_GROUPS}
          getId={(group: Group) => group.id}
          render={({offset, onPageChange, onSelect, rows, selectedId, total}) => (
            <BaseGroupList
              {...baseListProps(args)}
              groups={rows}
              totalResults={total}
              offset={offset}
              onPageChange={onPageChange}
              onSelect={onSelect}
              selectedGroupId={selectedId}
            />
          )}
        />
      ),
    stories: listStories('Live (GET /groups)'),
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['GroupCreate'],
            jsx: jsx('GroupCreate', pick(args, 'title', 'ouId'), {extra: ['onCreated={handleCreated}']}),
          }
        : {
            imports: ['BaseGroupCreate'],
            jsx: jsx('BaseGroupCreate', pick(args, 'title', 'isSubmitting', 'error'), {
              extra: ['onSubmit={handleSubmit}', 'onCancel={close}'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      TITLE,
      {
        control: 'bool',
        description: 'Base only: disables the form while saving.',
        name: 'isSubmitting',
        type: 'boolean',
      },
      ERROR,
      OU_ID,
    ],
    defaults: {error: '', isSubmitting: false, ouId: '', source: 'base', title: ''},
    group: 'Admin: groups',
    id: 'groupcreate',
    live: true,
    name: 'GroupCreate',
    render: (args: Args, action: Action) => (
      <Narrow width={480}>
        {isLive(args) ? (
          <GroupCreate
            title={str(args, 'title') || undefined}
            ouId={str(args, 'ouId') || undefined}
            onCreated={(group: Group) => action('onCreated', group.id)}
            onCancel={() => action('onCancel')}
          />
        ) : (
          <BaseGroupCreate
            title={str(args, 'title') || undefined}
            isSubmitting={bool(args, 'isSubmitting')}
            error={str(args, 'error') || null}
            onSubmit={(group: {description?: string; name: string}) => action('onSubmit', JSON.stringify(group))}
            onCancel={() => action('onCancel')}
          />
        )}
      </Narrow>
    ),
    stories: [
      {id: 'base', name: 'Form'},
      {args: {error: 'A group with this name already exists.'}, id: 'error', name: 'Error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (POST /groups, writes)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {imports: ['GroupMembers'], jsx: jsx('GroupMembers', pick(args, 'groupId', 'ouId', 'editable', 'title'))}
        : {
            imports: ['BaseGroupMembers'],
            jsx: jsx('BaseGroupMembers', pick(args, 'title', 'isLoading', 'error'), {
              extra: [
                'members={members}',
                ...(bool(args, 'editable')
                  ? ['candidates={{user: users, agent: agents}}', 'onAdd={addMember}', 'onRemove={removeMember}']
                  : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      idControl('groupId'),
      {
        control: 'text',
        description: 'Live only: the organization unit the member picker lists from.',
        name: 'ouId',
        type: 'string',
      },
      TITLE,
      {control: 'bool', description: 'Adds the member picker and remove buttons.', name: 'editable', type: 'boolean'},
      LOADING,
      ERROR,
    ],
    defaults: {editable: true, error: '', groupId: '', isLoading: false, ouId: '', source: 'base', title: ''},
    group: 'Admin: groups',
    id: 'groupmembers',
    live: true,
    name: 'GroupMembers',
    render: (args: Args, action: Action) => {
      if (!isLive(args)) return <GroupMembersStory args={args} action={action} />;
      if (!str(args, 'groupId')) return <RequiresId name="groupId" />;

      return (
        <Narrow width={640}>
          <GroupMembers
            groupId={str(args, 'groupId')}
            ouId={str(args, 'ouId') || undefined}
            editable={bool(args, 'editable')}
            title={str(args, 'title') || undefined}
          />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Editable'},
      {args: {editable: false}, id: 'readonly', name: 'Read only'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs groupId)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['GroupDetails'],
            jsx: jsx('GroupDetails', pick(args, 'groupId', 'editable', 'deletable', 'administrationMode'), {
              extra: ['onDeleted={backToList}'],
            }),
          }
        : {
            imports: ['BaseGroupDetails'],
            jsx: jsx('BaseGroupDetails', pick(args, 'isLoading', 'error'), {
              extra: [
                'group={group}',
                'members={<GroupMembers groupId={group.id} ouId={group.ouId} />}',
                ...(bool(args, 'deletable') ? ['onDelete={deleteGroup}'] : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      idControl('groupId'),
      {
        control: 'bool',
        description: 'Live: lets admins add and remove members. Base: the sample members view.',
        name: 'editable',
        type: 'boolean',
      },
      {control: 'bool', description: 'Shows the delete button (onDelete).', name: 'deletable', type: 'boolean'},
      {
        control: ['native', 'flow'],
        description:
          'How the delete and member removals run: the management API, or the configured administration flows (live only).',
        name: 'administrationMode',
        type: "'native' | 'flow'",
      },
      LOADING,
      ERROR,
    ],
    defaults: {
      administrationMode: 'native',
      deletable: true,
      editable: true,
      error: '',
      groupId: '',
      isLoading: false,
      source: 'base',
    },
    group: 'Admin: groups',
    id: 'groupdetails',
    live: true,
    name: 'GroupDetails',
    render: (args: Args, action: Action) => {
      if (isLive(args)) {
        if (!str(args, 'groupId')) return <RequiresId name="groupId" />;

        return (
          <Narrow width={640}>
            <GroupDetails
              groupId={str(args, 'groupId')}
              editable={bool(args, 'editable')}
              deletable={bool(args, 'deletable')}
              administrationMode={str(args, 'administrationMode') as AdministrationMode}
              onDeleted={() => action('onDeleted')}
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={640}>
          <BaseGroupDetails
            group={SAMPLE_GROUPS[0]}
            isLoading={bool(args, 'isLoading')}
            error={str(args, 'error') || null}
            onDelete={bool(args, 'deletable') ? () => action('onDelete', SAMPLE_GROUPS[0].id) : undefined}
            members={<GroupMembersStory args={{...args, error: '', isLoading: false, title: ''}} action={action} />}
          />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Sample group'},
      {args: {deletable: false, editable: false}, id: 'readonly', name: 'Read only'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs groupId)'},
      {args: {administrationMode: 'flow', source: 'live'}, id: 'live-flows', name: 'Live through administration flows'},
    ],
  },
  {
    code: (args: Args) => listCode(args, 'RoleList', 'roles', 'selectedRoleId'),
    controls: LIST_CONTROLS,
    defaults: LIST_DEFAULTS,
    group: 'Admin: roles',
    id: 'rolelist',
    live: true,
    name: 'RoleList',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <Narrow width={720}>
          <RoleList {...liveListProps(args, action)} />
        </Narrow>
      ) : (
        <Paged<RoleSummary>
          args={args}
          action={action}
          rows={SAMPLE_ROLES}
          getId={(role: RoleSummary) => role.id}
          render={({offset, onPageChange, onSelect, rows, selectedId, total}) => (
            <BaseRoleList
              {...baseListProps(args)}
              roles={rows}
              totalResults={total}
              offset={offset}
              onPageChange={onPageChange}
              onSelect={onSelect}
              selectedRoleId={selectedId}
            />
          )}
        />
      ),
    stories: listStories('Live (GET /roles)'),
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['RoleCreate'],
            jsx: jsx('RoleCreate', pick(args, 'title', 'ouId'), {extra: ['onCreated={handleCreated}']}),
          }
        : {
            imports: ['BaseRoleCreate'],
            jsx: jsx('BaseRoleCreate', pick(args, 'title', 'isSubmitting', 'error'), {
              extra: ['onSubmit={handleSubmit}', 'onCancel={close}'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      TITLE,
      {
        control: 'bool',
        description: 'Base only: disables the form while saving.',
        name: 'isSubmitting',
        type: 'boolean',
      },
      ERROR,
      OU_ID,
    ],
    defaults: {error: '', isSubmitting: false, ouId: '', source: 'base', title: ''},
    group: 'Admin: roles',
    id: 'rolecreate',
    live: true,
    name: 'RoleCreate',
    render: (args: Args, action: Action) => (
      <Narrow width={480}>
        {isLive(args) ? (
          <RoleCreate
            title={str(args, 'title') || undefined}
            ouId={str(args, 'ouId') || undefined}
            onCreated={(role: {id: string}) => action('onCreated', role.id)}
            onCancel={() => action('onCancel')}
          />
        ) : (
          <BaseRoleCreate
            title={str(args, 'title') || undefined}
            isSubmitting={bool(args, 'isSubmitting')}
            error={str(args, 'error') || null}
            onSubmit={(role: {description?: string; name: string}) => action('onSubmit', JSON.stringify(role))}
            onCancel={() => action('onCancel')}
          />
        )}
      </Narrow>
    ),
    stories: [
      {id: 'base', name: 'Form'},
      {args: {isSubmitting: true}, id: 'submitting', name: 'Submitting'},
      {args: {source: 'live'}, id: 'live', name: 'Live (POST /roles, writes)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {imports: ['RolePermissions'], jsx: jsx('RolePermissions', pick(args, 'roleId', 'editable', 'title'))}
        : {
            imports: ['BaseRolePermissions'],
            jsx: jsx('BaseRolePermissions', pick(args, 'title', 'isLoading', 'error'), {
              extra: [
                'permissions={role.permissions}',
                'resourceServerNames={resourceServerNames}',
                ...(bool(args, 'editable')
                  ? [
                      'resourceServers={resourceServers}',
                      'availablePermissions={availablePermissions}',
                      'onResourceServerSelect={loadPermissions}',
                      'onAdd={grant}',
                      'onRemove={revoke}',
                    ]
                  : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      idControl('roleId'),
      TITLE,
      {
        control: 'bool',
        description: 'Adds the resource server and permission picker, and remove buttons that ask first.',
        name: 'editable',
        type: 'boolean',
      },
      LOADING,
      ERROR,
      {...EMPTY, description: 'Base only: a role that grants nothing.'},
    ],
    defaults: {editable: false, empty: false, error: '', isLoading: false, roleId: '', source: 'base', title: ''},
    group: 'Admin: roles',
    id: 'rolepermissions',
    live: true,
    name: 'RolePermissions',
    render: (args: Args, action: Action) => {
      if (isLive(args)) {
        if (!str(args, 'roleId')) return <RequiresId name="roleId" />;

        return (
          <Narrow width={560}>
            <RolePermissions
              key={`${str(args, 'roleId')}:${String(bool(args, 'editable'))}`}
              roleId={str(args, 'roleId')}
              editable={bool(args, 'editable')}
              title={str(args, 'title') || undefined}
            />
          </Narrow>
        );
      }

      return (
        <RolePermissionsStory
          key={`${String(bool(args, 'editable'))}:${String(bool(args, 'empty'))}`}
          args={args}
          action={action}
        />
      );
    },
    stories: [
      {id: 'base', name: 'Two resource servers'},
      {args: {editable: true}, id: 'editable', name: 'Editable'},
      {args: {empty: true}, id: 'empty', name: 'No permissions'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs roleId)'},
      {args: {editable: true, source: 'live'}, id: 'live-editable', name: 'Live, editable (PUT /roles, writes)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {imports: ['RoleAssignments'], jsx: jsx('RoleAssignments', pick(args, 'roleId', 'ouId', 'editable', 'title'))}
        : {
            imports: ['BaseRoleAssignments'],
            jsx: jsx('BaseRoleAssignments', pick(args, 'title', 'isLoading', 'error'), {
              extra: [
                'assignments={assignments}',
                ...(bool(args, 'editable')
                  ? [
                      'candidates={{user: users, group: groups, agent: agents}}',
                      'onAssign={assign}',
                      'onUnassign={unassign}',
                    ]
                  : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      idControl('roleId'),
      {
        control: 'text',
        description: 'Live only: the organization unit the assignee picker lists from.',
        name: 'ouId',
        type: 'string',
      },
      TITLE,
      {control: 'bool', description: 'Adds the assignee picker and remove buttons.', name: 'editable', type: 'boolean'},
      LOADING,
      ERROR,
    ],
    defaults: {editable: true, error: '', isLoading: false, ouId: '', roleId: '', source: 'base', title: ''},
    group: 'Admin: roles',
    id: 'roleassignments',
    live: true,
    name: 'RoleAssignments',
    render: (args: Args, action: Action) => {
      if (!isLive(args)) return <RoleAssignmentsStory args={args} action={action} />;
      if (!str(args, 'roleId')) return <RequiresId name="roleId" />;

      return (
        <Narrow width={640}>
          <RoleAssignments
            roleId={str(args, 'roleId')}
            ouId={str(args, 'ouId') || undefined}
            editable={bool(args, 'editable')}
            title={str(args, 'title') || undefined}
          />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Editable'},
      {args: {editable: false}, id: 'readonly', name: 'Read only'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs roleId)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['RoleDetails'],
            jsx: jsx('RoleDetails', pick(args, 'roleId', 'editable', 'deletable', 'administrationMode'), {
              extra: ['onDeleted={backToList}'],
            }),
          }
        : {
            imports: ['BaseRoleDetails'],
            jsx: jsx('BaseRoleDetails', pick(args, 'isLoading', 'error'), {
              extra: [
                'role={role}',
                'permissions={<BaseRolePermissions permissions={role.permissions} />}',
                'assignments={<RoleAssignments roleId={role.id} ouId={role.ouId} />}',
                ...(bool(args, 'deletable') ? ['onDelete={deleteRole}'] : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      idControl('roleId'),
      {
        control: 'bool',
        description: 'Live: lets admins assign and unassign the role. Base: the sample assignments view.',
        name: 'editable',
        type: 'boolean',
      },
      {control: 'bool', description: 'Shows the delete button (onDelete).', name: 'deletable', type: 'boolean'},
      {
        control: ['native', 'flow'],
        description:
          'How the delete and unassignments run: the management API, or the configured administration flows (live only).',
        name: 'administrationMode',
        type: "'native' | 'flow'",
      },
      LOADING,
      ERROR,
    ],
    defaults: {
      administrationMode: 'native',
      deletable: true,
      editable: true,
      error: '',
      roleId: '',
      isLoading: false,
      source: 'base',
    },
    group: 'Admin: roles',
    id: 'roledetails',
    live: true,
    name: 'RoleDetails',
    render: (args: Args, action: Action) => {
      if (isLive(args)) {
        if (!str(args, 'roleId')) return <RequiresId name="roleId" />;

        return (
          <Narrow width={640}>
            <RoleDetails
              roleId={str(args, 'roleId')}
              editable={bool(args, 'editable')}
              deletable={bool(args, 'deletable')}
              administrationMode={str(args, 'administrationMode') as AdministrationMode}
              onDeleted={() => action('onDeleted')}
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={640}>
          <BaseRoleDetails
            role={SAMPLE_ROLES[1]}
            isLoading={bool(args, 'isLoading')}
            error={str(args, 'error') || null}
            onDelete={bool(args, 'deletable') ? () => action('onDelete', SAMPLE_ROLES[1].id) : undefined}
            permissions={
              <BaseRolePermissions permissions={SAMPLE_PERMISSIONS} resourceServerNames={RESOURCE_SERVER_NAMES} />
            }
            assignments={
              <RoleAssignmentsStory args={{...args, error: '', isLoading: false, title: ''}} action={action} />
            }
          />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Sample role'},
      {args: {deletable: false, editable: false}, id: 'readonly', name: 'Read only'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs roleId)'},
      {args: {administrationMode: 'flow', source: 'live'}, id: 'live-flows', name: 'Live through administration flows'},
    ],
  },
  {
    code: (args: Args) => listCode(args, 'AgentList', 'agents', 'selectedAgentId'),
    controls: LIST_CONTROLS,
    defaults: LIST_DEFAULTS,
    group: 'Admin: agents',
    id: 'agentlist',
    live: true,
    name: 'AgentList',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <Narrow width={720}>
          <AgentList {...liveListProps(args, action)} />
        </Narrow>
      ) : (
        <SampleSearch<BasicAgent>
          action={action}
          attributes={[{label: 'Name', value: 'name'}]}
          rows={SAMPLE_AGENTS}
          valueOf={(agent: BasicAgent, attribute: string) => (attribute === 'name' ? getAgentName(agent) : undefined)}
          render={({onSearch, rows: matching, search, searchAttributes}) => (
            <Paged<BasicAgent>
              key={JSON.stringify(search)}
              args={args}
              action={action}
              rows={matching}
              getId={(agent: BasicAgent) => agent.id}
              render={({offset, onPageChange, onSelect, rows, selectedId, total}) => (
                <BaseAgentList
                  {...baseListProps(args)}
                  agents={rows}
                  totalResults={total}
                  offset={offset}
                  onPageChange={onPageChange}
                  onSelect={onSelect}
                  selectedAgentId={selectedId}
                  search={search}
                  searchAttributes={searchAttributes}
                  onSearch={onSearch}
                />
              )}
            />
          )}
        />
      ),
    stories: listStories('Live (GET /agents)'),
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['AgentCreate'],
            jsx: jsx('AgentCreate', pick(args, 'title', 'ouId', 'owner'), {extra: ['onCreated={handleCreated}']}),
          }
        : {
            imports: ['BaseAgentCreate'],
            jsx: jsx('BaseAgentCreate', pick(args, 'title', 'isSubmitting', 'error'), {
              extra: ['agentTypes={agentTypeOptions}', 'onSubmit={handleSubmit}', 'onCancel={close}'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      TITLE,
      {
        control: 'bool',
        description: 'Base only: disables the form while saving.',
        name: 'isSubmitting',
        type: 'boolean',
      },
      ERROR,
      OU_ID,
      {
        control: 'text',
        description: 'Live only: owner user ID; empty uses the signed-in user.',
        name: 'owner',
        type: 'string',
      },
    ],
    defaults: {error: '', isSubmitting: false, ouId: '', owner: '', source: 'base', title: ''},
    group: 'Admin: agents',
    id: 'agentcreate',
    live: true,
    name: 'AgentCreate',
    render: (args: Args, action: Action) => (
      <Narrow width={480}>
        {isLive(args) ? (
          <AgentCreate
            title={str(args, 'title') || undefined}
            ouId={str(args, 'ouId') || undefined}
            owner={str(args, 'owner') || undefined}
            onCreated={(agent: Agent) => action('onCreated', agent.id)}
            onCancel={() => action('onCancel')}
          />
        ) : (
          <BaseAgentCreate
            title={str(args, 'title') || undefined}
            agentTypes={TYPE_OPTIONS.agent}
            isSubmitting={bool(args, 'isSubmitting')}
            error={str(args, 'error') || null}
            onSubmit={(agent: {description?: string; name: string; type: string}) =>
              action('onSubmit', JSON.stringify(agent))
            }
            onCancel={() => action('onCancel')}
          />
        )}
      </Narrow>
    ),
    stories: [
      {id: 'base', name: 'Sample agent types'},
      {args: {error: 'Agent type is not allowed in this organization unit.'}, id: 'error', name: 'Error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (GET /agent-types, POST /agents)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['AgentDetails'],
            jsx: jsx('AgentDetails', pick(args, 'agentId', 'deletable'), {extra: ['onDeleted={backToList}']}),
          }
        : {
            imports: ['BaseAgentDetails'],
            jsx: jsx('BaseAgentDetails', pick(args, 'isLoading', 'error'), {
              extra: [
                'agent={agent}',
                'groups={groups}',
                'roles={roles}',
                ...(bool(args, 'deletable') ? ['onDelete={deleteAgent}'] : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      idControl('agentId'),
      {control: 'bool', description: 'Shows the delete button (onDelete).', name: 'deletable', type: 'boolean'},
      LOADING,
      ERROR,
    ],
    defaults: {agentId: '', deletable: true, error: '', isLoading: false, source: 'base'},
    group: 'Admin: agents',
    id: 'agentdetails',
    live: true,
    name: 'AgentDetails',
    render: (args: Args, action: Action) => {
      if (isLive(args)) {
        if (!str(args, 'agentId')) return <RequiresId name="agentId" />;

        return (
          <Narrow width={560}>
            <AgentDetails
              agentId={str(args, 'agentId')}
              deletable={bool(args, 'deletable')}
              onDeleted={() => action('onDeleted')}
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={560}>
          <BaseAgentDetails
            agent={SAMPLE_AGENT}
            groups={SAMPLE_MEMBERSHIPS}
            roles={['Viewer', 'Ticket router']}
            isLoading={bool(args, 'isLoading')}
            error={str(args, 'error') || null}
            onDelete={bool(args, 'deletable') ? () => action('onDelete', SAMPLE_AGENT.id) : undefined}
          />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Sample agent'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs agentId)'},
    ],
  },
  {
    code: (args: Args) => listCode(args, 'ApplicationList', 'applications', 'selectedApplicationId'),
    controls: LIST_CONTROLS,
    defaults: LIST_DEFAULTS,
    group: 'Admin: applications',
    id: 'applicationlist',
    live: true,
    name: 'ApplicationList',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <Narrow width={720}>
          <ApplicationList {...liveListProps(args, action)} />
        </Narrow>
      ) : (
        <Paged<BasicApplication>
          args={args}
          action={action}
          rows={SAMPLE_APPLICATIONS}
          getId={(application: BasicApplication) => application.id}
          render={({offset, onPageChange, onSelect, rows, selectedId, total}) => (
            <BaseApplicationList
              {...baseListProps(args)}
              applications={rows}
              totalResults={total}
              offset={offset}
              onPageChange={onPageChange}
              onSelect={onSelect}
              selectedApplicationId={selectedId}
            />
          )}
        />
      ),
    stories: listStories('Live (GET /applications)'),
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['ApplicationCreate'],
            jsx: jsx('ApplicationCreate', pick(args, 'title', 'ouId'), {extra: ['onCreated={handleCreated}']}),
          }
        : {
            imports: ['BaseApplicationCreate'],
            jsx: jsx('BaseApplicationCreate', pick(args, 'title', 'isSubmitting', 'error'), {
              extra: [
                'onSubmit={handleSubmit}',
                'onCancel={close}',
                ...(bool(args, 'showSecret') ? ['clientSecret={createdSecret}', 'onSecretDismiss={clearSecret}'] : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      TITLE,
      {
        control: 'bool',
        description: 'Base only: disables the form while saving.',
        name: 'isSubmitting',
        type: 'boolean',
      },
      ERROR,
      {
        control: 'bool',
        description: 'Base only: passes clientSecret, which shows the secret once in place of the form.',
        name: 'showSecret',
        type: 'string | null',
      },
      OU_ID,
    ],
    defaults: {error: '', isSubmitting: false, ouId: '', showSecret: false, source: 'base', title: ''},
    group: 'Admin: applications',
    id: 'applicationcreate',
    live: true,
    name: 'ApplicationCreate',
    render: (args: Args, action: Action) => (
      <Narrow width={480}>
        {isLive(args) ? (
          <ApplicationCreate
            title={str(args, 'title') || undefined}
            ouId={str(args, 'ouId') || undefined}
            onCreated={(application: Application) => action('onCreated', application.id)}
            onCancel={() => action('onCancel')}
          />
        ) : (
          <BaseApplicationCreate
            title={str(args, 'title') || undefined}
            isSubmitting={bool(args, 'isSubmitting')}
            error={str(args, 'error') || null}
            clientSecret={bool(args, 'showSecret') ? 'sample-client-secret-1f9c' : null}
            onSecretDismiss={() => action('onSecretDismiss')}
            onSubmit={(application: ApplicationCreateSubmission) => action('onSubmit', JSON.stringify(application))}
            onCancel={() => action('onCancel')}
          />
        )}
      </Narrow>
    ),
    stories: [
      {id: 'base', name: 'Empty form'},
      {args: {showSecret: true}, id: 'secret', name: 'Client secret shown once'},
      {args: {error: 'An application with this name already exists.'}, id: 'error', name: 'Error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (POST /applications)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['ApplicationDetails'],
            jsx: jsx('ApplicationDetails', pick(args, 'applicationId', 'editable', 'deletable', 'secretRegenerable'), {
              extra: ['onDeleted={backToList}'],
            }),
          }
        : {
            imports: ['BaseApplicationDetails'],
            jsx: jsx('BaseApplicationDetails', pick(args, 'isLoading', 'error'), {
              extra: [
                'application={application}',
                ...(bool(args, 'editable') ? ['onUpdate={saveApplication}'] : []),
                ...(bool(args, 'deletable') ? ['onDelete={deleteApplication}'] : []),
                ...(bool(args, 'secretRegenerable')
                  ? [
                      'onRegenerateSecret={regenerateSecret}',
                      'clientSecret={newSecret}',
                      'onSecretDismiss={clearSecret}',
                    ]
                  : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      idControl('applicationId'),
      {control: 'bool', description: 'Shows the edit button (onUpdate).', name: 'editable', type: 'boolean'},
      {control: 'bool', description: 'Shows the delete button (onDelete).', name: 'deletable', type: 'boolean'},
      {
        control: 'bool',
        description: 'Shows the regenerate client secret button (onRegenerateSecret).',
        name: 'secretRegenerable',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: 'Base only: passes clientSecret, a regenerated secret shown once.',
        name: 'showSecret',
        type: 'string | null',
      },
      LOADING,
      ERROR,
    ],
    defaults: {
      applicationId: '',
      deletable: true,
      editable: true,
      error: '',
      isLoading: false,
      secretRegenerable: true,
      showSecret: false,
      source: 'base',
    },
    group: 'Admin: applications',
    id: 'applicationdetails',
    live: true,
    name: 'ApplicationDetails',
    render: (args: Args, action: Action) => {
      if (isLive(args)) {
        if (!str(args, 'applicationId')) return <RequiresId name="applicationId" />;

        return (
          <Narrow width={560}>
            <ApplicationDetails
              applicationId={str(args, 'applicationId')}
              editable={bool(args, 'editable')}
              deletable={bool(args, 'deletable')}
              secretRegenerable={bool(args, 'secretRegenerable')}
              onDeleted={() => action('onDeleted')}
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={560}>
          <BaseApplicationDetails
            application={SAMPLE_APPLICATION}
            isLoading={bool(args, 'isLoading')}
            error={str(args, 'error') || null}
            clientSecret={bool(args, 'showSecret') ? 'sample-client-secret-7a2e' : null}
            onSecretDismiss={() => action('onSecretDismiss')}
            onUpdate={
              bool(args, 'editable')
                ? (changes: ApplicationUpdateSubmission) => action('onUpdate', JSON.stringify(changes))
                : undefined
            }
            onDelete={bool(args, 'deletable') ? () => action('onDelete', SAMPLE_APPLICATION.id) : undefined}
            onRegenerateSecret={
              bool(args, 'secretRegenerable') ? () => action('onRegenerateSecret', SAMPLE_APPLICATION.id) : undefined
            }
          />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Sample application'},
      {args: {deletable: false, editable: false, secretRegenerable: false}, id: 'readonly', name: 'Read only'},
      {args: {showSecret: true}, id: 'secret', name: 'Regenerated secret'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs applicationId)'},
    ],
  },
];

/** The admin stories, each with a "Custom (MUI)" story that renders it through its render props. */
export const ADMIN_COMPONENTS: ComponentDef[] = STORIES.map(withCustomStory);
