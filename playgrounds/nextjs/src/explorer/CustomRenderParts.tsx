// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import MuiAlert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CssBaseline from '@mui/material/CssBaseline';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import {DataGrid, type GridColDef, type GridPaginationModel} from '@mui/x-data-grid';
import {
  type BaseGroupCreateRenderProps,
  type BaseUserDetailsRenderProps,
  BaseUserList,
  type BaseUserListRenderProps,
} from '@thunderid/nextjs';
import {
  BaseRolePermissions,
  type BaseRolePermissionsRenderProps,
  type BaseVerifyAttributeRenderProps,
  type DataTableColumn,
  type EmbeddedFlowComponent,
  type ManagedUser,
  type RolePermissionChange,
  type RoleResourcePermissions,
  useTheme,
} from '@thunderid/react';
import {ReactElement, ReactNode, useMemo, useState} from 'react';
import {SAMPLE_USERS} from './customRenderSamples';
import {bool, num, str} from './helpers';
import type {Action, Args} from './types';

/** MUI, themed to follow the playground's light or dark preview. */
export const Mui = ({children}: {children: ReactNode}): ReactElement => {
  const {colorScheme} = useTheme();
  const theme = useMemo(
    () => createTheme({palette: {mode: colorScheme === 'dark' ? 'dark' : 'light', primary: {main: '#3688FF'}}}),
    [colorScheme],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
};

/**
 * The user list's render props drawn as an MUI DataGrid: the SDK's columns become grid columns, and
 * the grid's server-side pagination maps onto the SDK's offset-based paging.
 */
export const UserDataGrid = ({
  columns,
  error,
  isLoading,
  limit,
  offset,
  onPageChange,
  onSelect,
  rows,
  selectedRowId,
  totalResults,
}: BaseUserListRenderProps): ReactElement => {
  const gridColumns: GridColDef<ManagedUser>[] = columns.map((column: DataTableColumn<ManagedUser>) => ({
    field: column.id,
    flex: column.id === 'name' ? 2 : 1,
    headerName: column.header,
    renderCell: ({row}: {row: ManagedUser}) => column.render(row),
    sortable: false,
  }));

  return (
    <Stack spacing={1}>
      {error && <MuiAlert severity="error">{error}</MuiAlert>}
      <DataGrid<ManagedUser>
        autoHeight
        columns={gridColumns}
        disableColumnMenu
        loading={isLoading}
        onPaginationModelChange={(model: GridPaginationModel) => onPageChange?.(model.page * model.pageSize)}
        onRowClick={onSelect ? ({row}: {row: ManagedUser}) => onSelect(row) : undefined}
        pageSizeOptions={[limit]}
        paginationMode="server"
        paginationModel={{page: Math.floor(offset / limit), pageSize: limit}}
        rowCount={totalResults}
        rowHeight={64}
        rowSelectionModel={{ids: new Set(selectedRowId ? [selectedRowId] : []), type: 'include'}}
        rows={rows}
      />
    </Stack>
  );
};

/** The group form's render props drawn with MUI inputs. */
export const GroupForm = ({
  error,
  handleInputChange,
  handleSubmit,
  isSubmitting,
  isValid,
  onCancel,
  values,
}: BaseGroupCreateRenderProps): ReactElement => (
  <Card variant="outlined">
    <CardHeader title="New group" subheader="Rendered with MUI from the SDK's render props" />
    <CardContent>
      <Stack spacing={2}>
        {error && <MuiAlert severity="error">{error}</MuiAlert>}
        <TextField
          label="Name"
          required
          size="small"
          value={values.name}
          onChange={(event) => handleInputChange('name', event.target.value)}
        />
        <TextField
          label="Description"
          multiline
          minRows={2}
          size="small"
          value={values.description}
          onChange={(event) => handleInputChange('description', event.target.value)}
        />
      </Stack>
    </CardContent>
    <CardActions sx={{justifyContent: 'flex-end'}}>
      {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      <Button variant="contained" disabled={!isValid || isSubmitting} loading={isSubmitting} onClick={handleSubmit}>
        Create group
      </Button>
    </CardActions>
  </Card>
);

/** The user details' render props drawn as an MUI card. */
export const UserCard = ({
  attributes,
  displayName,
  error,
  groups,
  isDeleting,
  isLoading,
  isSendingVerification,
  onDelete,
  onSendVerification,
  sentVerification,
  user,
  verifiableAttributes,
  verificationStatusAttributes,
  verifiedAttributes,
}: BaseUserDetailsRenderProps): ReactElement => (
  <Card variant="outlined">
    {isLoading && !user ? (
      <CardContent>Loading…</CardContent>
    ) : (
      <>
        <CardHeader
          avatar={<Avatar>{displayName.slice(0, 1)}</Avatar>}
          title={displayName}
          subheader={user ? `${user.type} · ${user.ouHandle ?? user.ouId}` : undefined}
        />
        <CardContent>
          <Stack spacing={1.5}>
            {error && <MuiAlert severity="error">{error}</MuiAlert>}
            {sentVerification && (
              <MuiAlert severity="success">Link sent to {sentVerification.maskedDestination ?? 'the user'}</MuiAlert>
            )}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {Object.entries(attributes).map(([name, value]: [string, unknown]) => (
                <Chip key={name} size="small" variant="outlined" label={`${name}: ${String(value)}`} />
              ))}
            </Stack>
            {verificationStatusAttributes.map((name: string) => (
              <Stack key={name} direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  color={verifiedAttributes?.[name] ? 'success' : 'default'}
                  label={`${name}: ${verifiedAttributes?.[name] ? 'verified' : 'not verified'}`}
                />
                {onSendVerification && verifiableAttributes.includes(name) && !verifiedAttributes?.[name] && (
                  <Button size="small" loading={isSendingVerification} onClick={(): void => onSendVerification(name)}>
                    Verify
                  </Button>
                )}
              </Stack>
            ))}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {groups.map((group: {id: string; name: string}) => (
                <Chip key={group.id} size="small" color="primary" label={group.name} />
              ))}
            </Stack>
          </Stack>
        </CardContent>
        {onDelete && (
          <CardActions sx={{justifyContent: 'flex-end'}}>
            <Button color="error" loading={isDeleting} onClick={onDelete}>
              Delete
            </Button>
          </CardActions>
        )}
      </>
    )}
  </Card>
);

export const SampleUserGrid = ({action, args}: {action: Action; args: Args}): ReactElement => {
  const [offset, setOffset] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const limit: number = Math.max(1, num(args, 'limit'));

  return (
    <BaseUserList
      users={SAMPLE_USERS.slice(offset, offset + limit)}
      totalResults={SAMPLE_USERS.length}
      isLoading={bool(args, 'isLoading')}
      error={str(args, 'error') || null}
      limit={limit}
      offset={offset}
      onPageChange={(next: number) => {
        setOffset(next);
        action('onPageChange', `offset=${next}`);
      }}
      onSelect={(user: ManagedUser) => {
        setSelectedId(user.id);
        action('onSelect', user.id);
      }}
      selectedUserId={selectedId}
    >
      {(props: BaseUserListRenderProps) => <UserDataGrid {...props} />}
    </BaseUserList>
  );
};

// The step's components of the given types, at any depth.
const flowComponents = (components: EmbeddedFlowComponent[], types: string[]): EmbeddedFlowComponent[] =>
  components.flatMap((component: EmbeddedFlowComponent) => [
    ...(types.includes(component.type) ? [component] : []),
    ...flowComponents(component.components ?? [], types),
  ]);

const INPUT_TYPES: string[] = ['TEXT_INPUT', 'EMAIL_INPUT', 'PHONE_INPUT', 'OTP_INPUT', 'PASSWORD_INPUT'];

/** A verification step's render props drawn with MUI: the step's inputs and actions, resend and cancel. */
export const VerifyForm = (step: BaseVerifyAttributeRenderProps): ReactElement => {
  const isActive: boolean = !step.isComplete && !step.isFailed;

  return (
    <Card variant="outlined">
      <CardHeader title={step.title} subheader={[step.subtitle, step.destinationText].filter(Boolean).join(' ')} />
      <CardContent>
        <Stack spacing={2}>
          {step.error && <MuiAlert severity="error">{step.error}</MuiAlert>}
          {step.isComplete && <MuiAlert severity="success">{step.successMessage}</MuiAlert>}
          {isActive &&
            flowComponents(step.components, INPUT_TYPES).map((input: EmbeddedFlowComponent) => {
              const name: string = input.ref ?? input.id;

              return (
                <TextField
                  key={name}
                  label={String(input.label ?? name)}
                  autoComplete="one-time-code"
                  size="small"
                  value={step.values[name] ?? ''}
                  error={!!(step.touched[name] && step.fieldErrors[name])}
                  helperText={step.touched[name] ? step.fieldErrors[name] : undefined}
                  onChange={(event) => step.handleInputChange(name, event.target.value)}
                />
              );
            })}
        </Stack>
      </CardContent>
      <CardActions sx={{justifyContent: 'flex-end'}}>
        {step.onCancel && <Button onClick={step.onCancel}>{isActive ? 'Cancel' : 'Close'}</Button>}
        {step.handleResend && (
          <Button disabled={step.isLoading} onClick={() => void step.handleResend?.()}>
            Send a new code
          </Button>
        )}
        {step.onDone && (
          <Button variant="contained" onClick={step.onDone}>
            Done
          </Button>
        )}
        {isActive &&
          flowComponents(step.components, ['ACTION']).map((action: EmbeddedFlowComponent) => (
            <Button
              key={action.id}
              variant="contained"
              disabled={!step.isValid || step.isLoading}
              loading={step.isLoading}
              onClick={() => void step.handleSubmit(action, step.values)}
            >
              {String(action.label ?? action.id)}
            </Button>
          ))}
      </CardActions>
    </Card>
  );
};

/**
 * A role's permissions drawn as one MUI card per resource server. When editable, a chip's delete icon asks
 * before revoking (the custom render owns that confirmation) and two MUI selects add a permission.
 */
export const PermissionCards = ({
  availablePermissions = undefined,
  error,
  isLoading,
  isMutating,
  onAdd = undefined,
  onRemove = undefined,
  onResourceServerSelect = undefined,
  permissions,
  resolveResourceServerName,
  resourceServers = undefined,
}: BaseRolePermissionsRenderProps): ReactElement => {
  const [serverId, setServerId] = useState<string>('');
  const [permission, setPermission] = useState<string>('');
  const [pending, setPending] = useState<RolePermissionChange | null>(null);
  const granted: string[] =
    permissions.find((entry: RoleResourcePermissions) => entry.resourceServerId === serverId)?.permissions ?? [];
  const options = (availablePermissions?.[serverId] ?? []).filter(
    (candidate: {permission: string}) => !granted.includes(candidate.permission),
  );

  return (
    <Stack spacing={1.5}>
      {isLoading && <span>Loading…</span>}
      {error && <MuiAlert severity="error">{error}</MuiAlert>}
      {onAdd && resourceServers && (
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label="Resource server"
            value={serverId}
            sx={{minWidth: 180}}
            onChange={(event) => {
              setServerId(event.target.value);
              setPermission('');
              onResourceServerSelect?.(event.target.value);
            }}
          >
            {resourceServers.map((server: {id: string; name: string}) => (
              <MenuItem key={server.id} value={server.id}>
                {server.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Permission"
            value={permission}
            disabled={!serverId}
            sx={{minWidth: 180}}
            onChange={(event) => setPermission(event.target.value)}
          >
            {options.map((candidate: {name: string; permission: string}) => (
              <MenuItem key={candidate.permission} value={candidate.permission}>
                {candidate.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!permission || isMutating}
            onClick={() => {
              onAdd({permission, resourceServerId: serverId});
              setPermission('');
            }}
          >
            Add
          </Button>
        </Stack>
      )}
      {pending && onRemove && (
        <MuiAlert
          severity="warning"
          action={
            <>
              <Button size="small" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => {
                  onRemove(pending);
                  setPending(null);
                }}
              >
                Remove
              </Button>
            </>
          }
        >
          {`Remove ${pending.permission}?`}
        </MuiAlert>
      )}
      {permissions.map((entry: RoleResourcePermissions) => (
        <Card key={entry.resourceServerId} variant="outlined">
          <CardHeader title={resolveResourceServerName(entry.resourceServerId)} />
          <CardContent>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {entry.permissions.map((item: string) => (
                <Chip
                  key={item}
                  size="small"
                  variant="outlined"
                  label={item}
                  onDelete={
                    onRemove
                      ? () => setPending({permission: item, resourceServerId: entry.resourceServerId})
                      : undefined
                  }
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

/** `BaseRolePermissions` with sample permissions held in state, drawn by {@link PermissionCards}. */
export const SamplePermissionCards = ({action}: {action: Action}): ReactElement => {
  const [permissions, setPermissions] = useState<RoleResourcePermissions[]>([
    {permissions: ['orders:read'], resourceServerId: 'rs_orders'},
  ]);
  const apply = ({permission, resourceServerId}: RolePermissionChange, add: boolean): void => {
    setPermissions((previous: RoleResourcePermissions[]) => {
      const granted: string[] =
        previous.find((entry: RoleResourcePermissions) => entry.resourceServerId === resourceServerId)?.permissions ??
        [];
      const next: string[] = add ? [...granted, permission] : granted.filter((item: string) => item !== permission);

      return [
        ...previous.filter((entry: RoleResourcePermissions) => entry.resourceServerId !== resourceServerId),
        ...(next.length ? [{permissions: next, resourceServerId}] : []),
      ];
    });
    action(add ? 'onAdd' : 'onRemove', `${resourceServerId} ${permission}`);
  };

  return (
    <BaseRolePermissions
      permissions={permissions}
      resourceServers={[
        {id: 'rs_orders', name: 'Orders API'},
        {id: 'rs_system', name: 'System'},
      ]}
      availablePermissions={{
        rs_orders: [
          {name: 'Read', permission: 'orders:read'},
          {name: 'Refund', permission: 'orders:refund'},
        ],
        rs_system: [{name: 'Manage users', permission: 'system:user'}],
      }}
      onResourceServerSelect={(id: string) => action('onResourceServerSelect', id)}
      onAdd={(change: RolePermissionChange) => apply(change, true)}
      onRemove={(change: RolePermissionChange) => apply(change, false)}
    >
      {(props: BaseRolePermissionsRenderProps) => <PermissionCards {...props} />}
    </BaseRolePermissions>
  );
};
