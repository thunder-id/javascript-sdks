// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import MuiAlert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
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
import Typography from '@mui/material/Typography';
import {DataGrid, type GridColDef, type GridPaginationModel, type GridValidRowModel} from '@mui/x-data-grid';
import {
  type AdminListRenderProps,
  type AdminSearchValue,
  type BaseAgentCreateRenderProps,
  type BaseAgentDetailsRenderProps,
  type BaseGroupCreateRenderProps,
  type BaseRolePermissionsRenderProps,
  type BaseUserCreateRenderProps,
  type BaseUserDetailsRenderProps,
  type DataTableColumn,
  useTheme,
} from '@thunderid/react';
import {ReactElement, ReactNode, useMemo, useState} from 'react';

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

// The grid sets a cell's line-height to the row height; reset it so multi-line cells, such as the SDK's
// avatar and name, lay out as they do in the SDK's own table.
const cell = (content: ReactNode): ReactNode => (
  <Box sx={{alignItems: 'center', display: 'flex', height: '100%', lineHeight: 'normal'}}>{content}</Box>
);

/**
 * A list's render props drawn as an MUI DataGrid: the SDK's columns become grid columns, and the grid's
 * server-side pagination maps onto the SDK's offset-based paging.
 */
export const ListGrid = <T extends GridValidRowModel & {id: string}>({
  columns,
  error,
  isLoading,
  limit,
  offset,
  onPageChange,
  onSearch,
  onSelect,
  rows,
  search,
  searchAttributes,
  selectedRowId,
  totalResults,
}: AdminListRenderProps<T>): ReactElement => {
  const gridColumns: GridColDef<T>[] = columns.map((column: DataTableColumn<T>) => ({
    field: column.id,
    flex: column.id === 'name' ? 2 : 1,
    headerName: column.header,
    // The grid sets the cell's line-height to the row height; reset it so multi-line cells, such as the
    // SDK's avatar and name, lay out as they do in the SDK's own table.
    renderCell: (params: {row: T}): ReactNode => cell(column.render(params.row)),
    sortable: false,
  }));

  return (
    <Stack spacing={1}>
      {onSearch && searchAttributes?.length ? (
        <SearchBar attributes={searchAttributes} search={search ?? null} onSearch={onSearch} />
      ) : null}
      {error && <MuiAlert severity="error">{error}</MuiAlert>}
      <DataGrid<T>
        autoHeight
        columns={gridColumns}
        disableColumnMenu
        loading={isLoading}
        onPaginationModelChange={(model: GridPaginationModel) => onPageChange?.(model.page * model.pageSize)}
        onRowClick={onSelect ? ({row}: {row: T}) => onSelect(row) : undefined}
        pageSizeOptions={[limit]}
        paginationMode="server"
        paginationModel={{page: Math.floor(offset / limit), pageSize: limit}}
        rowCount={totalResults}
        rowHeight={64}
        rowSelectionModel={{ids: new Set(selectedRowId ? [selectedRowId] : []), type: 'include'}}
        rows={rows}
        localeText={search ? {noRowsLabel: `No matches for "${search.value}"`} : undefined}
      />
    </Stack>
  );
};

/** The list's search drawn with MUI: an attribute select, a search field and a clear chip. */
const SearchBar = ({
  attributes,
  onSearch,
  search,
}: {
  attributes: {label: string; value: string}[];
  onSearch: (search: AdminSearchValue | null) => void;
  search: AdminSearchValue | null;
}): ReactElement => {
  const [attribute, setAttribute] = useState<string>(search?.attribute ?? attributes[0]?.value ?? '');
  const [value, setValue] = useState<string>(search?.value ?? '');
  const label: string = attributes.find((option) => option.value === attribute)?.label ?? attribute;

  return (
    <Stack
      component="form"
      direction="row"
      spacing={1}
      alignItems="center"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim() ? {attribute, value: value.trim()} : null);
      }}
    >
      {attributes.length > 1 && (
        <TextField
          select
          size="small"
          label="Search by"
          sx={{minWidth: 140}}
          value={attribute}
          onChange={(event) => setAttribute(event.target.value)}
        >
          {attributes.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField
        size="small"
        type="search"
        label={label}
        placeholder={`Exact ${label.toLowerCase()}`}
        sx={{flex: 1}}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="submit" variant="outlined">
        Search
      </Button>
      {search && (
        <Chip
          label={`${search.attribute} = ${search.value}`}
          onDelete={() => {
            setValue('');
            onSearch(null);
          }}
        />
      )}
    </Stack>
  );
};

const FormCard = ({
  children,
  error,
  onCancel = undefined,
  onSubmit,
  isSubmitting,
  isValid,
  submitLabel,
  title,
}: {
  children: ReactNode;
  error: string | null;
  isSubmitting: boolean;
  isValid: boolean;
  onCancel?: () => void;
  onSubmit: () => void;
  submitLabel: string;
  title: string;
}): ReactElement => (
  <Card variant="outlined">
    <CardHeader title={title} subheader="Rendered with MUI from the SDK's render props" />
    <CardContent>
      <Stack spacing={2}>
        {error && <MuiAlert severity="error">{error}</MuiAlert>}
        {children}
      </Stack>
    </CardContent>
    <CardActions sx={{justifyContent: 'flex-end'}}>
      {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      <Button variant="contained" disabled={!isValid || isSubmitting} loading={isSubmitting} onClick={onSubmit}>
        {submitLabel}
      </Button>
    </CardActions>
  </Card>
);

/** A group or role form's render props drawn with MUI inputs. */
export const NamedForm = ({noun, ...form}: BaseGroupCreateRenderProps & {noun: 'group' | 'role'}): ReactElement => (
  <FormCard
    title={`New ${noun}`}
    submitLabel={`Create ${noun}`}
    error={form.error}
    isSubmitting={form.isSubmitting}
    isValid={form.isValid}
    onCancel={form.onCancel}
    onSubmit={form.handleSubmit}
  >
    <TextField
      label="Name"
      required
      size="small"
      value={form.values.name}
      onChange={(event) => form.handleInputChange('name', event.target.value)}
    />
    <TextField
      label="Description"
      multiline
      minRows={2}
      size="small"
      value={form.values.description}
      onChange={(event) => form.handleInputChange('description', event.target.value)}
    />
  </FormCard>
);

/** The user form's render props drawn with an MUI select and text fields. */
export const UserForm = (form: BaseUserCreateRenderProps): ReactElement => (
  <FormCard
    title="New user"
    submitLabel="Create user"
    error={form.error}
    isSubmitting={form.isSubmitting}
    isValid={form.isValid}
    onCancel={form.onCancel}
    onSubmit={form.handleSubmit}
  >
    <TextField
      select
      label="User type"
      size="small"
      value={form.type}
      onChange={(event) => form.handleTypeChange(event.target.value)}
    >
      {form.userTypes.map((option: {label: string; value: string}) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
    {form.fields.map((field: {label?: string; name: string; required?: boolean; type?: string}) => (
      <TextField
        key={field.name}
        label={field.label ?? field.name}
        required={field.required}
        type={field.type ?? 'text'}
        size="small"
        value={form.values[field.name] ?? ''}
        onChange={(event) => form.handleInputChange(field.name, event.target.value)}
      />
    ))}
  </FormCard>
);

/** The agent form's render props drawn with MUI inputs. */
export const AgentForm = (form: BaseAgentCreateRenderProps): ReactElement => (
  <FormCard
    title="New agent"
    submitLabel="Register agent"
    error={form.error}
    isSubmitting={form.isSubmitting}
    isValid={form.isValid}
    onCancel={form.onCancel}
    onSubmit={form.handleSubmit}
  >
    <TextField
      label="Name"
      required
      size="small"
      value={form.values.name}
      onChange={(event) => form.handleInputChange('name', event.target.value)}
    />
    <TextField
      select
      label="Agent type"
      size="small"
      value={form.values.type}
      onChange={(event) => form.handleInputChange('type', event.target.value)}
    >
      {form.agentTypes.map((option: {label: string; value: string}) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
    <TextField
      label="Description"
      size="small"
      value={form.values.description}
      onChange={(event) => form.handleInputChange('description', event.target.value)}
    />
  </FormCard>
);

const ChipRow = ({
  items,
  color = undefined,
}: {
  color?: 'primary';
  items: {id: string; label: string}[];
}): ReactElement => (
  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
    {items.length === 0 && <Typography variant="body2">None</Typography>}
    {items.map((item: {id: string; label: string}) => (
      <Chip key={item.id} size="small" color={color} variant={color ? 'filled' : 'outlined'} label={item.label} />
    ))}
  </Stack>
);

const DetailsCard = ({
  children,
  isDeleting,
  isLoading,
  onDelete = undefined,
  subheader = undefined,
  title = undefined,
}: {
  children: ReactNode;
  isDeleting: boolean;
  isLoading: boolean;
  onDelete?: () => void;
  subheader?: string;
  title?: string;
}): ReactElement => (
  <Card variant="outlined">
    {isLoading && !title ? (
      <CardContent>Loading…</CardContent>
    ) : (
      <>
        <CardHeader avatar={<Avatar>{(title ?? '?').slice(0, 1)}</Avatar>} title={title} subheader={subheader} />
        <CardContent>
          <Stack spacing={1.5}>{children}</Stack>
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

/** The user details' render props drawn as an MUI card. */
export const UserCard = (details: BaseUserDetailsRenderProps): ReactElement => (
  <DetailsCard
    title={details.user ? details.displayName : undefined}
    subheader={details.user ? `${details.user.type} · ${details.user.ouHandle ?? details.user.ouId}` : undefined}
    isLoading={details.isLoading}
    isDeleting={details.isDeleting}
    onDelete={details.onDelete}
  >
    {details.error && <MuiAlert severity="error">{details.error}</MuiAlert>}
    <ChipRow
      items={Object.entries(details.attributes).map(([name, value]: [string, unknown]) => ({
        id: name,
        label: `${name}: ${String(value)}`,
      }))}
    />
    <ChipRow color="primary" items={details.groups.map((group) => ({id: group.id, label: group.name}))} />
  </DetailsCard>
);

/** The agent details' render props drawn as an MUI card. */
export const AgentCard = (details: BaseAgentDetailsRenderProps): ReactElement => (
  <DetailsCard
    title={details.agent?.name}
    subheader={details.agent ? `${details.agent.type} · ${details.agent.ouHandle ?? details.agent.ouId}` : undefined}
    isLoading={details.isLoading}
    isDeleting={details.isDeleting}
    onDelete={details.onDelete}
  >
    {details.error && <MuiAlert severity="error">{details.error}</MuiAlert>}
    {details.agent?.description && <Typography variant="body2">{details.agent.description}</Typography>}
    <Typography variant="overline">Groups</Typography>
    <ChipRow color="primary" items={details.groups.map((group) => ({id: group.id, label: group.name}))} />
    <Typography variant="overline">Roles</Typography>
    <ChipRow items={details.roles.map((role: string) => ({id: role, label: role}))} />
  </DetailsCard>
);

/** The role permissions' render props drawn as one MUI card per resource server. */
export const PermissionCards = ({
  error,
  isLoading,
  permissions,
  resolveResourceServerName,
}: BaseRolePermissionsRenderProps): ReactElement => (
  <Stack spacing={1.5}>
    {isLoading && <Typography variant="body2">Loading…</Typography>}
    {error && <MuiAlert severity="error">{error}</MuiAlert>}
    {!isLoading && !error && permissions.length === 0 && <Typography variant="body2">No permissions.</Typography>}
    {permissions.map((entry: {permissions: string[]; resourceServerId: string}) => (
      <Card key={entry.resourceServerId} variant="outlined">
        <CardHeader title={resolveResourceServerName(entry.resourceServerId)} subheader={entry.resourceServerId} />
        <CardContent>
          <ChipRow items={entry.permissions.map((permission: string) => ({id: permission, label: permission}))} />
        </CardContent>
      </Card>
    ))}
  </Stack>
);

interface Identity {
  display?: string;
  id: string;
  type: string;
}

/**
 * Group members or role assignments drawn as an MUI DataGrid with a remove action, and an MUI picker
 * that adds from the candidates the render props hand over.
 */
export const IdentityGrid = ({
  candidates = undefined,
  error,
  isLoading,
  isMutating,
  onAdd = undefined,
  onRemove = undefined,
  onTypeFilterChange = undefined,
  rows,
  typeFilter = null,
}: {
  candidates?: Partial<Record<string, {id: string; label: string}[]>>;
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  onAdd?: (identity: {id: string; type: string}) => void;
  onRemove?: (row: Identity) => void;
  onTypeFilterChange?: (type: string | null) => void;
  rows: Identity[];
  typeFilter?: string | null;
}): ReactElement => {
  const types: string[] = Object.keys(candidates ?? {});
  const [type, setType] = useState<string>(types[0] ?? '');
  const [id, setId] = useState<string>('');
  const present = new Set<string>(rows.map((row: Identity) => row.id));
  const options: {id: string; label: string}[] = (candidates?.[type] ?? []).filter(
    (option: {id: string}) => !present.has(option.id),
  );
  const columns: GridColDef<Identity & {key: string}>[] = [
    {
      field: 'display',
      flex: 2,
      headerName: 'Name',
      sortable: false,
      valueGetter: (_value, row) => row.display ?? row.id,
    },
    {field: 'type', flex: 1, headerName: 'Type', sortable: false},
    ...(onRemove
      ? [
          {
            field: 'actions',
            headerName: '',
            renderCell: (params: {row: Identity}) => (
              <Button color="error" size="small" disabled={isMutating} onClick={() => onRemove(params.row)}>
                Remove
              </Button>
            ),
            sortable: false,
            width: 110,
          } satisfies GridColDef<Identity & {key: string}>,
        ]
      : []),
  ];

  return (
    <Stack spacing={1.5}>
      {error && <MuiAlert severity="error">{error}</MuiAlert>}
      {onTypeFilterChange && (
        <Stack direction="row" spacing={1}>
          {['all', 'user', 'group', 'agent', 'app'].map((value: string) => (
            <Chip
              key={value}
              label={value === 'all' ? 'All types' : value}
              color={(typeFilter ?? 'all') === value ? 'primary' : 'default'}
              variant={(typeFilter ?? 'all') === value ? 'filled' : 'outlined'}
              onClick={() => onTypeFilterChange(value === 'all' ? null : value)}
            />
          ))}
        </Stack>
      )}
      {onAdd && candidates && (
        <Stack direction="row" spacing={1}>
          <TextField
            select
            label="Type"
            size="small"
            sx={{minWidth: 120}}
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setId('');
            }}
          >
            {types.map((value: string) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Identity"
            size="small"
            sx={{flex: 1}}
            value={id}
            onChange={(event) => setId(event.target.value)}
          >
            {options.map((option: {id: string; label: string}) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!id || isMutating}
            onClick={() => {
              onAdd({id, type});
              setId('');
            }}
          >
            Add
          </Button>
        </Stack>
      )}
      <DataGrid<Identity & {key: string}>
        autoHeight
        columns={columns}
        disableColumnMenu
        getRowId={(row: Identity & {key: string}) => row.key}
        hideFooter
        loading={isLoading}
        rows={rows.map((row: Identity) => ({...row, key: `${row.type}:${row.id}`}))}
      />
    </Stack>
  );
};
