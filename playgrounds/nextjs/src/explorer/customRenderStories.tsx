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
  RolePermissions,
  type BaseRolePermissionsRenderProps,
  UserDetails,
  UserList,
  VerifyAttribute,
} from '@thunderid/nextjs';
import {BaseVerifyAttribute, type BaseVerifyAttributeRenderProps, type EmbeddedSelfFlowRequest} from '@thunderid/react';
import {NeedsId} from './AdminParts';
import {
  GroupForm,
  Mui,
  PermissionCards,
  SamplePermissionCards,
  SampleUserGrid,
  UserCard,
  UserDataGrid,
  VerifyForm,
} from './CustomRenderParts';
import {
  SAMPLE_MEMBERSHIPS,
  SAMPLE_USERS,
  SAMPLE_VERIFICATION_STEP,
  submitSampleVerification,
} from './customRenderSamples';
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

const MUI_CARD_SNIPPET = `<UserDetails userId={userId} deletable attributeVerification>
  {({user, displayName, attributes, groups, onDelete, verifiableAttributes, verificationStatusAttributes, verifiedAttributes, onSendVerification, isSendingVerification, sentVerification}) => (
    <Card>
      <CardHeader title={displayName} subheader={user?.type} />
      <CardContent>
        {sentVerification && <Alert severity="success">Link sent to {sentVerification.maskedDestination}</Alert>}
        {Object.entries(attributes).map(([name, value]) => (
          <Chip key={name} label={\`\${name}: \${value}\`} />
        ))}
        {verificationStatusAttributes.map((name) => (
          <Stack key={name} direction="row">
            <Chip label={\`\${name}: \${verifiedAttributes?.[name] ? 'verified' : 'not verified'}\`} />
            {onSendVerification && verifiableAttributes.includes(name) && !verifiedAttributes?.[name] && (
              <Button loading={isSendingVerification} onClick={() => onSendVerification(name)}>Send link</Button>
            )}
          </Stack>
        ))}
        {groups.map((group) => <Chip key={group.id} color="primary" label={group.name} />)}
      </CardContent>
      {onDelete && <Button color="error" onClick={onDelete}>Delete</Button>}
    </Card>
  )}
</UserDetails>`;

const MUI_VERIFY_SNIPPET = `<VerifyAttribute attribute="email" onCancel={close} onComplete={close}>
  {({title, subtitle, destinationText, components, values, handleInputChange, handleSubmit, handleResend, onCancel, isLoading, isValid, isComplete, successMessage, error}) => (
    <Card>
      <CardHeader title={title} subheader={\`\${subtitle} \${destinationText ?? ''}\`} />
      <CardContent>
        {error && <Alert severity="error">{error}</Alert>}
        {isComplete ? (
          <Alert severity="success">{successMessage}</Alert>
        ) : (
          <TextField label="Code" value={values.otp ?? ''} onChange={(e) => handleInputChange('otp', e.target.value)} />
        )}
      </CardContent>
      <CardActions>
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        {handleResend && <Button onClick={handleResend}>Send a new code</Button>}
        <Button variant="contained" disabled={!isValid} loading={isLoading} onClick={() => handleSubmit(components[0].components[1], values)}>
          Verify
        </Button>
      </CardActions>
    </Card>
  )}
</VerifyAttribute>`;

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
      otherImports: ["import {Alert, Button, Card, CardContent, CardHeader, Chip, Stack} from '@mui/material';"],
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
                attributeVerification
                onDeleted={() => action('onDeleted')}
              >
                {(props: BaseUserDetailsRenderProps) => <UserCard {...props} />}
              </UserDetails>
            ) : (
              <BaseUserDetails
                user={{...SAMPLE_USERS[0], verifiedAttributes: {}}}
                groups={SAMPLE_MEMBERSHIPS}
                onDelete={bool(args, 'deletable') ? () => action('onDelete', SAMPLE_USERS[0].id) : undefined}
                onSendVerification={(attribute: string) => action('onSendVerification', attribute)}
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
  {
    code: () => ({
      imports: ['VerifyAttribute'],
      jsx: MUI_VERIFY_SNIPPET,
      otherImports: [
        "import {Alert, Button, Card, CardActions, CardContent, CardHeader, TextField} from '@mui/material';",
      ],
    }),
    controls: [
      {
        ...SOURCE_CONTROL,
        description:
          'base renders the Base component with a sample flow; live renders the connected component, whose steps go through the SDK server action.',
      },
      {control: 'text', description: 'Live only: attribute to verify.', name: 'attribute', type: 'string'},
    ],
    defaults: {attribute: 'email', source: 'base'},
    group: 'Custom rendering',
    id: 'custom-verifyattribute-form',
    live: true,
    name: 'VerifyAttribute → MUI form',
    render: (args: Args, action: Action) => (
      <Mui>
        <Narrow width={440}>
          {isLive(args) ? (
            <VerifyAttribute
              key={str(args, 'attribute')}
              attribute={str(args, 'attribute') || 'email'}
              onCancel={() => action('onCancel')}
              onComplete={() => action('onComplete')}
              onError={(error: Error) => action('onError', error.message)}
            >
              {(props: BaseVerifyAttributeRenderProps) => <VerifyForm {...props} />}
            </VerifyAttribute>
          ) : (
            <BaseVerifyAttribute
              attributeDisplayName="Email"
              onCancel={() => action('onCancel')}
              onComplete={() => action('onComplete')}
              onInitialize={() => Promise.resolve(SAMPLE_VERIFICATION_STEP)}
              onSubmit={(payload: EmbeddedSelfFlowRequest) => {
                action('onSubmit', JSON.stringify(payload));

                return submitSampleVerification(payload);
              }}
            >
              {(props: BaseVerifyAttributeRenderProps) => <VerifyForm {...props} />}
            </BaseVerifyAttribute>
          )}
        </Narrow>
      </Mui>
    ),
    stories: [
      {id: 'base', name: 'Sample flow (code 123456)'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs sign-in, sends a code)'},
    ],
  },
  {
    code: () => ({
      imports: ['RolePermissions'],
      jsx: `<RolePermissions roleId={roleId} editable>
  {({permissions, resolveResourceServerName, onRemove}) =>
    permissions.map((entry) => (
      <Card key={entry.resourceServerId}>
        <CardHeader title={resolveResourceServerName(entry.resourceServerId)} />
        <CardContent>
          {entry.permissions.map((permission) => (
            <Chip
              key={permission}
              label={permission}
              // Ask before removing: the custom render owns the confirmation.
              onDelete={onRemove && (() => confirm('Remove ' + permission + '?') &&
                onRemove({permission, resourceServerId: entry.resourceServerId}))}
            />
          ))}
        </CardContent>
      </Card>
    ))
  }
</RolePermissions>`,
      otherImports: ["import {Card, CardContent, CardHeader, Chip} from '@mui/material';"],
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'text', description: 'Live only: the role to load and edit.', name: 'roleId', type: 'string'},
    ],
    defaults: {roleId: '', source: 'base'},
    group: 'Custom rendering',
    id: 'custom-rolepermissions-cards',
    live: true,
    name: 'RolePermissions → MUI cards',
    render: (args: Args, action: Action) => {
      if (isLive(args) && !str(args, 'roleId')) return <NeedsId name="roleId" from="the RoleList story" />;

      return (
        <Mui>
          <Narrow width={560}>
            {isLive(args) ? (
              <RolePermissions key={str(args, 'roleId')} roleId={str(args, 'roleId')} editable>
                {(props: BaseRolePermissionsRenderProps) => <PermissionCards {...props} />}
              </RolePermissions>
            ) : (
              <SamplePermissionCards action={action} />
            )}
          </Narrow>
        </Mui>
      );
    },
    stories: [
      {id: 'base', name: 'Sample, editable'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs roleId, writes)'},
    ],
  },
];
