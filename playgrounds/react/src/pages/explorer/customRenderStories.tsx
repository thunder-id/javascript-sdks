// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AdminListRenderProps,
  type AdminSearchValue,
  BaseAgentCreate,
  BaseAgentDetails,
  BaseAgentList,
  BaseGroupCreate,
  BaseGroupList,
  type BaseGroupMembersRenderProps,
  BaseRoleCreate,
  BaseRoleList,
  BaseRolePermissions,
  type BaseRoleAssignmentsRenderProps,
  BaseUserCreate,
  BaseUserDetails,
  BaseUserList,
  type BasicAgent,
  type Group,
  type ManagedUser,
  type RoleSummary,
} from '@thunderid/react';
import {ReactElement, ReactNode} from 'react';
import {
  RESOURCE_SERVER_NAMES,
  SAMPLE_AGENT,
  SAMPLE_AGENTS,
  SAMPLE_GROUPS,
  SAMPLE_MEMBERSHIPS,
  SAMPLE_PERMISSIONS,
  SAMPLE_ROLES,
  SAMPLE_USERS,
  TYPE_OPTIONS,
} from './adminSamples';
import {GroupMembersStory, Paged, RoleAssignmentsStory, SampleSearch} from './AdminStoryWidgets';
import {
  AgentCard,
  AgentForm,
  IdentityGrid,
  ListGrid,
  Mui,
  NamedForm,
  PermissionCards,
  UserCard,
  UserForm,
} from './CustomRenderWidgets';
import {num, str} from './storyHelpers';
import {Narrow} from './StoryWidgets';
import type {Action, Args, ComponentDef, PropControl, Snippet, StoryDef} from './types';

/** The `source` control, with the custom renderer as a third option. */
const SOURCE_WITH_CUSTOM: PropControl = {
  control: ['base', 'live', 'custom'],
  description:
    'base renders the Base component with sample data; live uses the SDK context; custom renders the Base component with sample data through its children render function, drawn with MUI.',
  name: 'source',
  type: "'base' | 'live' | 'custom' (playground only)",
};

const isCustom = (args: Args): boolean => str(args, 'source') === 'custom';

const MUI_CARD = "import {Button, Card, CardContent, CardHeader, Chip} from '@mui/material';";
const MUI_GRID = "import {DataGrid} from '@mui/x-data-grid';";

const listSnippet = (name: string, rows: string): Snippet => ({
  imports: [name],
  jsx: `<${name} limit={10} onSelect={(row) => navigate(row.id)}>
  {({${rows}, columns, isLoading, limit, offset, totalResults, onPageChange, onSelect}) => (
    <DataGrid
      rows={${rows}}
      columns={columns.map((column) => ({
        field: column.id,
        headerName: column.header,
        renderCell: ({row}) => column.render(row),
      }))}
      loading={isLoading}
      paginationMode="server"
      rowCount={totalResults}
      paginationModel={{page: offset / limit, pageSize: limit}}
      onPaginationModelChange={(model) => onPageChange?.(model.page * model.pageSize)}
      onRowClick={({row}) => onSelect?.(row)}
    />
  )}
</${name}>`,
  otherImports: [MUI_GRID],
});

const formSnippet = (name: string, fields: string[]): Snippet => ({
  imports: [name],
  jsx: `<${name} onCreated={(created) => navigate(created.id)}>
  {({values, handleInputChange, handleSubmit, isValid, isSubmitting, error}) => (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
${fields
  .map(
    (field: string) =>
      `      <TextField label="${field}" value={values.${field}} onChange={(e) => handleInputChange('${field}', e.target.value)} />`,
  )
  .join('\n')}
      <Button variant="contained" disabled={!isValid} loading={isSubmitting} onClick={handleSubmit}>
        Create
      </Button>
    </Stack>
  )}
</${name}>`,
  otherImports: ["import {Alert, Button, Stack, TextField} from '@mui/material';"],
});

const identitySnippet = (name: string, idProp: string, rows: string, remove: string): Snippet => ({
  imports: [name],
  jsx: `<${name} ${idProp}={${idProp}} editable>
  {({${rows}, ${remove}, isMutating}) => (
    <DataGrid
      rows={${rows}}
      getRowId={(row) => \`\${row.type}:\${row.id}\`}
      columns={[
        {field: 'display', headerName: 'Name', flex: 1},
        {field: 'type', headerName: 'Type'},
        {
          field: 'actions',
          renderCell: ({row}) =>
            ${remove} && (
              <Button color="error" disabled={isMutating} onClick={() => ${remove}(row)}>
                Remove
              </Button>
            ),
        },
      ]}
    />
  )}
</${name}>`,
  otherImports: [MUI_GRID, "import {Button} from '@mui/material';"],
});

const CODE: Record<string, () => Snippet> = {
  agentcreate: () => formSnippet('AgentCreate', ['name', 'type', 'description']),
  agentdetails: () => ({
    imports: ['AgentDetails'],
    jsx: `<AgentDetails agentId={agentId} deletable>
  {({agent, groups, roles, onDelete}) => (
    <Card>
      <CardHeader title={agent?.name} subheader={agent?.type} />
      <CardContent>
        {groups.map((group) => <Chip key={group.id} color="primary" label={group.name} />)}
        {roles.map((role) => <Chip key={role} label={role} />)}
      </CardContent>
      {onDelete && <Button color="error" onClick={onDelete}>Delete</Button>}
    </Card>
  )}
</AgentDetails>`,
    otherImports: [MUI_CARD],
  }),
  agentlist: () => listSnippet('AgentList', 'agents'),
  groupcreate: () => formSnippet('GroupCreate', ['name', 'description']),
  grouplist: () => listSnippet('GroupList', 'groups'),
  groupmembers: () => identitySnippet('GroupMembers', 'groupId', 'members', 'onRemove'),
  roleassignments: () => identitySnippet('RoleAssignments', 'roleId', 'assignments', 'onUnassign'),
  rolecreate: () => formSnippet('RoleCreate', ['name', 'description']),
  rolelist: () => listSnippet('RoleList', 'roles'),
  rolepermissions: () => ({
    imports: ['RolePermissions'],
    jsx: `<RolePermissions roleId={roleId}>
  {({permissions, resolveResourceServerName}) =>
    permissions.map((entry) => (
      <Card key={entry.resourceServerId}>
        <CardHeader title={resolveResourceServerName(entry.resourceServerId)} />
        <CardContent>
          {entry.permissions.map((permission) => <Chip key={permission} label={permission} />)}
        </CardContent>
      </Card>
    ))
  }
</RolePermissions>`,
    otherImports: [MUI_CARD],
  }),
  usercreate: () => ({
    imports: ['UserCreate'],
    jsx: `<UserCreate onCreated={(user) => navigate(user.id)}>
  {({userTypes, type, handleTypeChange, fields, values, handleInputChange, handleSubmit, isValid, isSubmitting}) => (
    <Stack spacing={2}>
      <TextField select label="User type" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
        {userTypes.map((option) => (
          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
        ))}
      </TextField>
      {fields.map((field) => (
        <TextField
          key={field.name}
          label={field.name}
          type={field.type}
          value={values[field.name] ?? ''}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
        />
      ))}
      <Button variant="contained" disabled={!isValid} loading={isSubmitting} onClick={handleSubmit}>
        Create user
      </Button>
    </Stack>
  )}
</UserCreate>`,
    otherImports: ["import {Button, MenuItem, Stack, TextField} from '@mui/material';"],
  }),
  userdetails: () => ({
    imports: ['UserDetails'],
    jsx: `<UserDetails userId={userId} deletable>
  {({user, displayName, attributes, groups, onDelete}) => (
    <Card>
      <CardHeader title={displayName} subheader={user?.type} />
      <CardContent>
        {Object.entries(attributes).map(([name, value]) => (
          <Chip key={name} label={\`\${name}: \${value}\`} />
        ))}
        {groups.map((group) => <Chip key={group.id} color="primary" label={group.name} />)}
      </CardContent>
      {onDelete && <Button color="error" onClick={onDelete}>Delete</Button>}
    </Card>
  )}
</UserDetails>`,
    otherImports: [MUI_CARD],
  }),
  userlist: () => listSnippet('UserList', 'users'),
};

interface PagedListState<T> {
  grid: (props: AdminListRenderProps<T>) => ReactNode;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
  onSelect?: (row: T) => void;
  onSearch?: (search: AdminSearchValue | null) => void;
  rows: T[];
  search?: AdminSearchValue | null;
  searchAttributes?: {label: string; value: string}[];
  selectedId?: string;
  total: number;
}

interface SampleSearchConfig<T> {
  attributes: {label: string; value: string}[];
  valueOf: (row: T, attribute: string) => unknown;
}

/** Pages the sample rows and hands the Base list an MUI DataGrid as its render function. */
const pagedList = <T extends {id: string}>(
  args: Args,
  action: Action,
  rows: T[],
  render: (state: PagedListState<T>) => ReactNode,
  searchConfig?: SampleSearchConfig<T>,
): ReactElement => {
  const paged = (
    matching: T[],
    search?: Pick<PagedListState<T>, 'onSearch' | 'search' | 'searchAttributes'>,
  ): ReactElement => (
    <Paged<T>
      key={JSON.stringify(search?.search ?? null)}
      args={{...args, empty: false, selectable: true}}
      action={action}
      rows={matching}
      getId={(row: T) => row.id}
      render={(state) =>
        render({
          ...state,
          ...search,
          grid: (props: AdminListRenderProps<T>) => <ListGrid<T> {...props} />,
          limit: Math.max(1, num(args, 'limit')),
        })
      }
    />
  );

  if (!searchConfig) return paged(rows);

  return (
    <SampleSearch<T>
      action={action}
      attributes={searchConfig.attributes}
      rows={rows}
      valueOf={searchConfig.valueOf}
      render={({rows: matching, ...search}) => paged(matching, search)}
    />
  );
};

const RENDER: Record<string, (args: Args, action: Action) => ReactNode> = {
  agentcreate: (_args: Args, action: Action) => (
    <Narrow width={480}>
      <BaseAgentCreate
        agentTypes={TYPE_OPTIONS.agent}
        onSubmit={(agent: {name: string}) => action('onSubmit', JSON.stringify(agent))}
        onCancel={() => action('onCancel')}
      >
        {AgentForm}
      </BaseAgentCreate>
    </Narrow>
  ),
  agentdetails: (_args: Args, action: Action) => (
    <Narrow width={480}>
      <BaseAgentDetails
        agent={SAMPLE_AGENT}
        groups={SAMPLE_MEMBERSHIPS}
        roles={['Agent operator', 'Viewer']}
        onDelete={() => action('onDelete', SAMPLE_AGENT.id)}
      >
        {AgentCard}
      </BaseAgentDetails>
    </Narrow>
  ),
  agentlist: (args: Args, action: Action) =>
    pagedList<BasicAgent>(
      args,
      action,
      SAMPLE_AGENTS,
      (state: PagedListState<BasicAgent>) => (
        <BaseAgentList
          agents={state.rows}
          totalResults={state.total}
          limit={state.limit}
          offset={state.offset}
          onPageChange={state.onPageChange}
          onSelect={state.onSelect}
          selectedAgentId={state.selectedId}
          search={state.search}
          searchAttributes={state.searchAttributes}
          onSearch={state.onSearch}
        >
          {state.grid}
        </BaseAgentList>
      ),
      {
        attributes: [{label: 'Name', value: 'name'}],
        valueOf: (agent: BasicAgent, attribute: string) => (attribute === 'name' ? agent.name : undefined),
      },
    ),
  groupcreate: (_args: Args, action: Action) => (
    <Narrow width={480}>
      <BaseGroupCreate
        onSubmit={(group: {name: string}) => action('onSubmit', JSON.stringify(group))}
        onCancel={() => action('onCancel')}
      >
        {(form) => <NamedForm {...form} noun="group" />}
      </BaseGroupCreate>
    </Narrow>
  ),
  grouplist: (args: Args, action: Action) =>
    pagedList<Group>(args, action, SAMPLE_GROUPS, (state: PagedListState<Group>) => (
      <BaseGroupList
        groups={state.rows}
        totalResults={state.total}
        limit={state.limit}
        offset={state.offset}
        onPageChange={state.onPageChange}
        onSelect={state.onSelect}
        selectedGroupId={state.selectedId}
      >
        {state.grid}
      </BaseGroupList>
    )),
  groupmembers: (args: Args, action: Action) => (
    <GroupMembersStory args={{...args, editable: true, error: '', isLoading: false}} action={action}>
      {({candidates, members, onAdd, onRemove, ...rest}: BaseGroupMembersRenderProps) => (
        <IdentityGrid
          error={rest.error}
          isLoading={rest.isLoading}
          isMutating={rest.isMutating}
          rows={members}
          candidates={candidates}
          onAdd={onAdd ? (identity) => onAdd(identity as Parameters<typeof onAdd>[0]) : undefined}
          onRemove={onRemove ? (row) => onRemove(row as Parameters<typeof onRemove>[0]) : undefined}
        />
      )}
    </GroupMembersStory>
  ),
  roleassignments: (args: Args, action: Action) => (
    <RoleAssignmentsStory args={{...args, editable: true, error: '', isLoading: false}} action={action}>
      {({assignments, candidates, onAssign, onUnassign, ...rest}: BaseRoleAssignmentsRenderProps) => (
        <IdentityGrid
          error={rest.error}
          isLoading={rest.isLoading}
          isMutating={rest.isMutating}
          rows={assignments}
          candidates={candidates}
          onAdd={onAssign ? (identity) => onAssign(identity as Parameters<typeof onAssign>[0]) : undefined}
          onRemove={onUnassign ? (row) => onUnassign(row as Parameters<typeof onUnassign>[0]) : undefined}
          typeFilter={rest.typeFilter}
          onTypeFilterChange={
            rest.onTypeFilterChange
              ? (type) => rest.onTypeFilterChange?.(type as Parameters<NonNullable<typeof rest.onTypeFilterChange>>[0])
              : undefined
          }
        />
      )}
    </RoleAssignmentsStory>
  ),
  rolecreate: (_args: Args, action: Action) => (
    <Narrow width={480}>
      <BaseRoleCreate
        onSubmit={(role: {name: string}) => action('onSubmit', JSON.stringify(role))}
        onCancel={() => action('onCancel')}
      >
        {(form) => <NamedForm {...form} noun="role" />}
      </BaseRoleCreate>
    </Narrow>
  ),
  rolelist: (args: Args, action: Action) =>
    pagedList<RoleSummary>(args, action, SAMPLE_ROLES, (state: PagedListState<RoleSummary>) => (
      <BaseRoleList
        roles={state.rows}
        totalResults={state.total}
        limit={state.limit}
        offset={state.offset}
        onPageChange={state.onPageChange}
        onSelect={state.onSelect}
        selectedRoleId={state.selectedId}
      >
        {state.grid}
      </BaseRoleList>
    )),
  rolepermissions: () => (
    <Narrow width={560}>
      <BaseRolePermissions permissions={SAMPLE_PERMISSIONS} resourceServerNames={RESOURCE_SERVER_NAMES}>
        {PermissionCards}
      </BaseRolePermissions>
    </Narrow>
  ),
  usercreate: (_args: Args, action: Action) => (
    <Narrow width={480}>
      <BaseUserCreate
        userTypes={TYPE_OPTIONS.user}
        onSubmit={(user: {type: string}) => action('onSubmit', `type=${user.type}`)}
        onCancel={() => action('onCancel')}
      >
        {UserForm}
      </BaseUserCreate>
    </Narrow>
  ),
  userdetails: (_args: Args, action: Action) => (
    <Narrow width={480}>
      <BaseUserDetails
        user={SAMPLE_USERS[0]}
        groups={SAMPLE_MEMBERSHIPS}
        onDelete={() => action('onDelete', SAMPLE_USERS[0].id)}
      >
        {UserCard}
      </BaseUserDetails>
    </Narrow>
  ),
  userlist: (args: Args, action: Action) =>
    pagedList<ManagedUser>(
      args,
      action,
      SAMPLE_USERS,
      (state: PagedListState<ManagedUser>) => (
        <BaseUserList
          users={state.rows}
          totalResults={state.total}
          limit={state.limit}
          offset={state.offset}
          onPageChange={state.onPageChange}
          onSelect={state.onSelect}
          selectedUserId={state.selectedId}
          search={state.search}
          searchAttributes={state.searchAttributes}
          onSearch={state.onSearch}
        >
          {state.grid}
        </BaseUserList>
      ),
      {
        attributes: [
          {label: 'Username', value: 'username'},
          {label: 'Email', value: 'email'},
        ],
        valueOf: (user: ManagedUser, attribute: string) => user.attributes?.[attribute],
      },
    ),
};

/**
 * Replaces an admin component's live stories with a "Custom (MUI)" story. It renders the Base component
 * with sample data through its `children` render function, drawn with MUI.
 */
export const withCustomStory = (def: ComponentDef): ComponentDef => {
  const render: ((args: Args, action: Action) => ReactNode) | undefined = RENDER[def.id];
  const code: (() => Snippet) | undefined = CODE[def.id];

  if (!render || !code) return def;

  return {
    ...def,
    code: (args: Args) => (isCustom(args) ? code() : def.code(args)),
    controls: def.controls.map((control: PropControl) => (control.name === 'source' ? SOURCE_WITH_CUSTOM : control)),
    render: (args: Args, action: Action) =>
      isCustom(args) ? <Mui>{render(args, action)}</Mui> : def.render(args, action),
    // The tree offers sample-data stories only; the live variants stay reachable through the source control.
    stories: [
      ...def.stories.filter((story: StoryDef) => story.args?.['source'] !== 'live'),
      {args: {source: 'custom'}, id: 'custom', name: 'Custom (MUI)'},
    ],
  };
};
