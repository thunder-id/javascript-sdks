// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  BaseGroupCreate,
  type BaseGroupCreateRenderProps,
  BaseUserDetails,
  type BaseUserDetailsRenderProps,
  type BaseUserListRenderProps,
  GroupCreate,
  UserDetails,
  UserList,
} from '@thunderid/nextjs';
import {NeedsId} from './AdminParts';
import {GroupForm, Mui, SampleUserGrid, UserCard, UserDataGrid} from './CustomRenderParts';
import {SAMPLE_MEMBERSHIPS, SAMPLE_USERS} from './customRenderSamples';
import {bool, isLive, num, str} from './helpers';
import Narrow from './Narrow';
import type {Action, Args, ComponentDef, PropControl} from './types';

const SOURCE_CONTROL: PropControl = {
  control: ['base', 'live'],
  description:
    'base renders the Base component with sample data; live renders the connected component, whose management requests go through the SDK server action.',
  name: 'source',
  type: "'base' | 'live' (playground only)",
};

const MUI_GRID_SNIPPET = `<UserList limit={10} onSelect={(user) => navigate(user.id)}>
  {({users, columns, isLoading, limit, offset, totalResults, onPageChange, onSelect}) => (
    <DataGrid
      rows={users}
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
</UserList>`;

const MUI_FORM_SNIPPET = `<GroupCreate onCreated={(group) => navigate(group.id)}>
  {({values, handleInputChange, handleSubmit, isValid, isSubmitting, error}) => (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Name"
        value={values.name}
        onChange={(event) => handleInputChange('name', event.target.value)}
      />
      <Button variant="contained" disabled={!isValid} loading={isSubmitting} onClick={handleSubmit}>
        Create group
      </Button>
    </Stack>
  )}
</GroupCreate>`;

const MUI_CARD_SNIPPET = `<UserDetails userId={userId} deletable>
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
</UserDetails>`;

/**
 * Stories that replace an admin component's default UI through its `children` render function,
 * here with MUI. The same render props work with any component library.
 */
export const CUSTOM_RENDER_COMPONENTS: ComponentDef[] = [
  {
    code: () => ({
      from: '@thunderid/nextjs',
      imports: ['UserList'],
      jsx: MUI_GRID_SNIPPET,
      otherImports: ["import {DataGrid} from '@mui/x-data-grid';"],
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'number', description: 'Rows per page.', name: 'limit', type: 'number'},
      {control: 'bool', description: 'Base only: isLoading.', name: 'isLoading', type: 'boolean'},
      {control: 'text', description: 'Base only: error.', name: 'error', type: 'string | null'},
    ],
    defaults: {error: '', isLoading: false, limit: 3, source: 'base'},
    group: 'Custom rendering',
    id: 'custom-userlist-datagrid',
    live: true,
    name: 'UserList → MUI DataGrid',
    render: (args: Args, action: Action) => (
      <Mui>
        <Narrow width={760}>
          {isLive(args) ? (
            <UserList
              limit={Math.max(1, num(args, 'limit'))}
              onSelect={(user: {id: string}) => action('onSelect', user.id)}
            >
              {(props: BaseUserListRenderProps) => <UserDataGrid {...props} />}
            </UserList>
          ) : (
            <SampleUserGrid action={action} args={args} />
          )}
        </Narrow>
      </Mui>
    ),
    stories: [
      {id: 'base', name: 'Sample data'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {limit: 10, source: 'live'}, id: 'live', name: 'Live (needs sign-in)'},
    ],
  },
  {
    code: () => ({
      imports: ['GroupCreate'],
      jsx: MUI_FORM_SNIPPET,
      otherImports: ["import {Alert, Button, Stack, TextField} from '@mui/material';"],
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'bool', description: 'Base only: isSubmitting.', name: 'isSubmitting', type: 'boolean'},
      {control: 'text', description: 'Base only: error.', name: 'error', type: 'string | null'},
    ],
    defaults: {error: '', isSubmitting: false, source: 'base'},
    group: 'Custom rendering',
    id: 'custom-groupcreate-form',
    live: true,
    name: 'GroupCreate → MUI form',
    render: (args: Args, action: Action) => (
      <Mui>
        <Narrow width={480}>
          {isLive(args) ? (
            <GroupCreate
              onCreated={(group: {id: string}) => action('onCreated', group.id)}
              onCancel={() => action('onCancel')}
            >
              {(props: BaseGroupCreateRenderProps) => <GroupForm {...props} />}
            </GroupCreate>
          ) : (
            <BaseGroupCreate
              error={str(args, 'error') || null}
              isSubmitting={bool(args, 'isSubmitting')}
              onCancel={() => action('onCancel')}
              onSubmit={(group: {description?: string; name: string}) => action('onSubmit', JSON.stringify(group))}
            >
              {(props: BaseGroupCreateRenderProps) => <GroupForm {...props} />}
            </BaseGroupCreate>
          )}
        </Narrow>
      </Mui>
    ),
    stories: [
      {id: 'base', name: 'Sample'},
      {args: {error: 'A group with this name already exists.'}, id: 'error', name: 'Error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs sign-in)'},
    ],
  },
  {
    code: () => ({
      imports: ['UserDetails'],
      jsx: MUI_CARD_SNIPPET,
      otherImports: ["import {Button, Card, CardContent, CardHeader, Chip} from '@mui/material';"],
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'text', description: 'Live only: the user to load.', name: 'userId', type: 'string'},
      {control: 'bool', description: 'Passes onDelete.', name: 'deletable', type: 'boolean'},
    ],
    defaults: {deletable: true, source: 'base', userId: ''},
    group: 'Custom rendering',
    id: 'custom-userdetails-card',
    live: true,
    name: 'UserDetails → MUI card',
    render: (args: Args, action: Action) => {
      if (isLive(args) && !str(args, 'userId')) return <NeedsId name="userId" from="the UserList story" />;

      return (
        <Mui>
          <Narrow width={480}>
            {isLive(args) ? (
              <UserDetails
                userId={str(args, 'userId')}
                deletable={bool(args, 'deletable')}
                onDeleted={() => action('onDeleted')}
              >
                {(props: BaseUserDetailsRenderProps) => <UserCard {...props} />}
              </UserDetails>
            ) : (
              <BaseUserDetails
                user={SAMPLE_USERS[0]}
                groups={SAMPLE_MEMBERSHIPS}
                onDelete={bool(args, 'deletable') ? () => action('onDelete', SAMPLE_USERS[0].id) : undefined}
              >
                {(props: BaseUserDetailsRenderProps) => <UserCard {...props} />}
              </BaseUserDetails>
            )}
          </Narrow>
        </Mui>
      );
    },
    stories: [
      {id: 'base', name: 'Sample user'},
      {args: {deletable: false}, id: 'readonly', name: 'Without delete'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs userId)'},
    ],
  },
];
