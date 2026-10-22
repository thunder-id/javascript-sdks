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
import {type DataTableColumn, type ManagedUser, useTheme} from '@thunderid/react';
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
  onDelete,
  user,
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
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {Object.entries(attributes).map(([name, value]: [string, unknown]) => (
                <Chip key={name} size="small" variant="outlined" label={`${name}: ${String(value)}`} />
              ))}
            </Stack>
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
