// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import MuiAlert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {DataGrid, type GridColDef, type GridPaginationModel} from '@mui/x-data-grid';
import type {
  OrganizationUnit,
  OrganizationUnitBasic,
  Project,
  SharingPolicy,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
} from '@thunderid/browser';
import {
  type AdminListRenderProps,
  BaseOrganizationUnitDetails,
  BaseProjectDetails,
  BaseProjectSwitcher,
  BaseSharingPolicies,
  type BaseOrganizationUnitCreateRenderProps,
  type BaseOrganizationUnitDetailsRenderProps,
  type BaseProjectCreateRenderProps,
  type BaseProjectDetailsRenderProps,
  type BaseProjectSwitcherRenderProps,
  type BaseSharingPoliciesRenderProps,
  type DataTableColumn,
  type OrganizationUnitUpdateSubmission,
  type ProjectUpdateSubmission,
  useThunderID,
} from '@thunderid/react';
import {ReactElement, ReactNode, useState} from 'react';
import {Mui} from './CustomRenderWidgets';
import {
  SAMPLE_CONTENTS,
  SAMPLE_OVERLAY,
  SAMPLE_POLICIES,
  SAMPLE_PROJECTS,
  SAMPLE_UNIT,
  SAMPLE_UNIT_PARENT,
} from './managementAreaSamples';
import {bool, num, str} from './storyHelpers';
import type {Action, Args} from './types';

/** Pages sample rows locally, so a Base list story behaves like the connected list. */
export const SamplePaged = <T extends {id: string}>({
  action,
  args,
  render,
  rows,
}: {
  action: Action;
  args: Args;
  render: (state: {
    limit: number;
    offset: number;
    onPageChange: (offset: number) => void;
    onSelect?: (row: T) => void;
    rows: T[];
    selectedId?: string;
    total: number;
  }) => ReactNode;
  rows: T[];
}): ReactElement => {
  const [offset, setOffset] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const all: T[] = bool(args, 'empty') ? [] : rows;
  const limit: number = Math.max(1, num(args, 'limit'));

  return (
    <>
      {render({
        limit,
        offset,
        onPageChange: (next: number): void => {
          setOffset(next);
          action('onPageChange', `offset=${next}`);
        },
        onSelect: bool(args, 'selectable')
          ? (row: T): void => {
              setSelectedId(row.id);
              action('onSelect', row.id);
            }
          : undefined,
        rows: all.slice(offset, offset + limit),
        selectedId,
        total: all.length,
      })}
    </>
  );
};

/* MUI renderers, drawn through the components' children render functions. */

/** A list's render props drawn as an MUI DataGrid with server-side paging. */
export const MuiListGrid = <T extends {id: string}>({
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
}: AdminListRenderProps<T>): ReactElement => {
  const gridColumns: GridColDef<T>[] = columns.map((column: DataTableColumn<T>) => ({
    field: column.id,
    flex: 1,
    headerName: column.header,
    renderCell: (params: {row: T}): ReactNode => column.render(params.row),
    sortable: false,
  }));

  return (
    <Mui>
      <Stack spacing={1}>
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
          rowSelectionModel={{ids: new Set(selectedRowId ? [selectedRowId] : []), type: 'include'}}
          rows={rows}
        />
      </Stack>
    </Mui>
  );
};

const MuiFormCard = ({
  children,
  error,
  isSubmitting,
  isValid,
  onCancel = undefined,
  onSubmit,
  title,
}: {
  children: ReactNode;
  error: string | null;
  isSubmitting: boolean;
  isValid: boolean;
  onCancel?: () => void;
  onSubmit: () => void;
  title: string;
}): ReactElement => (
  <Mui>
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
          Create
        </Button>
      </CardActions>
    </Card>
  </Mui>
);

/** The project form's render props drawn with MUI text fields. */
export const MuiProjectForm = (form: BaseProjectCreateRenderProps): ReactElement => (
  <MuiFormCard
    title="New project"
    error={form.error}
    isSubmitting={form.isSubmitting}
    isValid={form.isValid}
    onCancel={form.onCancel}
    onSubmit={form.handleSubmit}
  >
    <TextField
      label="Handle"
      required
      size="small"
      helperText="Lowercase letters, numbers, hyphens and underscores"
      value={form.values.handle}
      onChange={(event) => form.handleInputChange('handle', event.target.value)}
    />
    <TextField
      label="Display name"
      required
      size="small"
      value={form.values.displayName}
      onChange={(event) => form.handleInputChange('displayName', event.target.value)}
    />
    <TextField
      label="Description"
      multiline
      minRows={2}
      size="small"
      value={form.values.description}
      onChange={(event) => form.handleInputChange('description', event.target.value)}
    />
  </MuiFormCard>
);

/** The organization unit form's render props drawn with MUI, including the parent select. */
export const MuiOrganizationUnitForm = (form: BaseOrganizationUnitCreateRenderProps): ReactElement => (
  <MuiFormCard
    title="New organization unit"
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
      label="Handle"
      required
      size="small"
      value={form.values.handle}
      onChange={(event) => form.handleInputChange('handle', event.target.value)}
    />
    <TextField
      label="Description"
      size="small"
      value={form.values.description}
      onChange={(event) => form.handleInputChange('description', event.target.value)}
    />
    {form.parentOptions.length > 0 && (
      <TextField
        select
        label="Parent"
        size="small"
        value={form.values.parentId}
        onChange={(event) => form.handleInputChange('parentId', event.target.value)}
      >
        <MenuItem value="">None (top level)</MenuItem>
        {form.parentOptions.map((option: {label: string; value: string}) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    )}
  </MuiFormCard>
);

/** A delete button that asks before it runs, as the specification requires of a custom render too. */
const ConfirmDelete = ({isLoading, onConfirm}: {isLoading: boolean; onConfirm: () => void}): ReactElement => {
  const [asking, setAsking] = useState<boolean>(false);

  return asking ? (
    <>
      <Button onClick={() => setAsking(false)}>Keep</Button>
      <Button color="error" variant="contained" loading={isLoading} onClick={onConfirm}>
        Confirm delete
      </Button>
    </>
  ) : (
    <Button color="error" onClick={() => setAsking(true)}>
      Delete
    </Button>
  );
};

/** The project details' render props drawn as an MUI card with an inline rename. */
export const MuiProjectCard = ({
  error,
  isDeleting,
  isLoading,
  isUpdating,
  onDelete,
  onUpdate,
  project,
}: BaseProjectDetailsRenderProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Mui>
      <Card variant="outlined">
        {isLoading && !project ? (
          <CardContent>Loading…</CardContent>
        ) : (
          <>
            <CardHeader title={project?.displayName} subheader={project?.handle} />
            <CardContent>
              <Stack spacing={1.5}>
                {error && <MuiAlert severity="error">{error}</MuiAlert>}
                {draft === null ? (
                  <Typography variant="body2">{project?.description ?? 'No description'}</Typography>
                ) : (
                  <TextField
                    label="Display name"
                    size="small"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                )}
                {project?.createdAt && <Chip size="small" variant="outlined" label={`Created ${project.createdAt}`} />}
              </Stack>
            </CardContent>
            <CardActions sx={{justifyContent: 'flex-end'}}>
              {onUpdate && draft === null && (
                <Button onClick={() => setDraft(project?.displayName ?? '')}>Rename</Button>
              )}
              {onUpdate && draft !== null && (
                <Button
                  variant="contained"
                  loading={isUpdating}
                  disabled={!draft.trim()}
                  onClick={() => {
                    onUpdate({description: project?.description, displayName: draft.trim()});
                    setDraft(null);
                  }}
                >
                  Save
                </Button>
              )}
              {onDelete && <ConfirmDelete isLoading={isDeleting} onConfirm={onDelete} />}
            </CardActions>
          </>
        )}
      </Card>
    </Mui>
  );
};

/** The project switcher's render props drawn as an MUI select. */
export const MuiProjectSwitcher = ({
  currentProject,
  error,
  isLoading,
  onLoadMore,
  onSelect,
  projects,
  totalResults,
}: BaseProjectSwitcherRenderProps): ReactElement => (
  <Mui>
    <Stack spacing={1}>
      {error && <MuiAlert severity="error">{error}</MuiAlert>}
      <TextField
        select
        label="Project"
        size="small"
        value={currentProject?.id ?? ''}
        helperText={isLoading ? 'Loading…' : `${projects.length} of ${totalResults} loaded`}
        onChange={(event) => onSelect(projects.find((project: Project) => project.id === event.target.value) ?? null)}
      >
        <MenuItem value="">No project</MenuItem>
        {currentProject && !projects.some((project: Project) => project.id === currentProject.id) && (
          <MenuItem value={currentProject.id}>{currentProject.displayName}</MenuItem>
        )}
        {projects.map((project: Project) => (
          <MenuItem key={project.id} value={project.id}>
            {project.displayName}
          </MenuItem>
        ))}
      </TextField>
      {onLoadMore && (
        <Button size="small" onClick={onLoadMore}>
          Load more projects
        </Button>
      )}
    </Stack>
  </Mui>
);

const ChipRow = ({items}: {items: {id: string; label: string}[]}): ReactElement => (
  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
    {items.length === 0 && <Typography variant="body2">None</Typography>}
    {items.map((item: {id: string; label: string}) => (
      <Chip key={item.id} size="small" variant="outlined" label={item.label} />
    ))}
  </Stack>
);

/** The organization unit details' render props drawn as an MUI card. */
export const MuiOrganizationUnitCard = ({
  contents,
  contentsError,
  error,
  isDeleting,
  isLoading,
  onDelete,
  onSelectChild,
  organizationUnit,
  parent,
}: BaseOrganizationUnitDetailsRenderProps): ReactElement => (
  <Mui>
    <Card variant="outlined">
      {isLoading && !organizationUnit ? (
        <CardContent>Loading…</CardContent>
      ) : (
        <>
          <CardHeader
            title={organizationUnit?.name}
            subheader={`${organizationUnit?.handle ?? ''}${parent ? ` · in ${parent.name}` : ''}`}
          />
          <CardContent>
            <Stack spacing={1.5}>
              {error && <MuiAlert severity="error">{error}</MuiAlert>}
              {contentsError && <MuiAlert severity="warning">{contentsError}</MuiAlert>}
              <Typography variant="overline">Child units</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {contents.childUnits.map((unit: OrganizationUnitBasic) => (
                  <Chip
                    key={unit.id}
                    size="small"
                    color="primary"
                    label={unit.name}
                    onClick={onSelectChild ? () => onSelectChild(unit) : undefined}
                  />
                ))}
              </Stack>
              <Typography variant="overline">Users ({contents.totals?.users ?? contents.users.length})</Typography>
              <ChipRow items={contents.users.map((user) => ({id: user.id, label: user.display ?? user.id}))} />
              <Typography variant="overline">Groups</Typography>
              <ChipRow items={contents.groups.map((group) => ({id: group.id, label: group.name}))} />
              <Typography variant="overline">Roles</Typography>
              <ChipRow items={contents.roles.map((role) => ({id: role.id, label: role.name}))} />
            </Stack>
          </CardContent>
          {onDelete && (
            <CardActions sx={{justifyContent: 'flex-end'}}>
              <ConfirmDelete isLoading={isDeleting} onConfirm={onDelete} />
            </CardActions>
          )}
        </>
      )}
    </Card>
  </Mui>
);

/** The sharing policies' render props drawn as an MUI list, with a one-click "share with every child unit" add. */
export const MuiSharingPolicies = ({
  describeScope,
  error,
  isLoading,
  isSubmitting,
  mutationError,
  onCreate,
  onDelete,
  overlay,
  overlayOuId,
  policies,
}: BaseSharingPoliciesRenderProps): ReactElement => (
  <Mui>
    <Stack spacing={1}>
      {error && <MuiAlert severity="error">{error}</MuiAlert>}
      {mutationError && <MuiAlert severity="error">{mutationError}</MuiAlert>}
      {isLoading && <Typography variant="body2">Loading…</Typography>}
      <List dense>
        {policies.map((policy: SharingPolicy) => (
          <ListItem
            key={policy.id}
            secondaryAction={
              policy.isReadOnly ? (
                <Chip size="small" label="Read only" />
              ) : (
                onDelete && <ConfirmDelete isLoading={isSubmitting} onConfirm={() => onDelete(policy)} />
              )
            }
          >
            <ListItemText
              primary={describeScope(policy).join(' · ')}
              secondary={`${policy.stage ?? 'share'} · version ${policy.version ?? 0}`}
            />
          </ListItem>
        ))}
      </List>
      {onCreate && (
        <Button
          variant="outlined"
          loading={isSubmitting}
          onClick={() => onCreate({childUnits: {mode: 'all'}} satisfies SharingPolicyRequest)}
        >
          Share with every child unit
        </Button>
      )}
      {overlayOuId && overlay && (
        <MuiAlert severity="info">
          In {overlayOuId}:{' '}
          {overlay.isOwnedByOU
            ? 'owned'
            : `shared by ${overlay.policyIds?.length ? overlay.policyIds.join(', ') : 'no policy'}`}
        </MuiAlert>
      )}
    </Stack>
  </Mui>
);

/** Shows the current project the SDK keeps, so a live switcher story shows its effect. */
export const CurrentProjectNote = (): ReactElement => {
  const {currentProject} = useThunderID();

  return (
    <Typography variant="body2" style={{marginTop: 12}}>
      Current project from <code>useThunderID()</code>:{' '}
      {currentProject ? `${currentProject.displayName} (${currentProject.id})` : 'none'}. ApplicationList and AgentList
      list it, and ApplicationCreate and AgentCreate place new resources in it.
    </Typography>
  );
};

/** Keeps sample policies in local state, applying the changes the Base component asks for. */
const useSamplePolicies = (
  action: Action,
): {
  onCreate: (request: SharingPolicyRequest) => void;
  onDelete: (policy: SharingPolicy) => void;
  onUpdate: (policy: SharingPolicy, request: SharingPolicyUpdateRequest) => void;
  policies: SharingPolicy[];
} => {
  const [policies, setPolicies] = useState<SharingPolicy[]>(SAMPLE_POLICIES);

  return {
    onCreate: (request: SharingPolicyRequest): void => {
      action('onCreate', JSON.stringify(request));
      setPolicies((previous: SharingPolicy[]) => [
        ...previous,
        {...request, id: `pol_${previous.length + 1}`, stage: 'share', version: 1},
      ]);
    },
    onDelete: (policy: SharingPolicy): void => {
      action('onDelete', policy.id);
      setPolicies((previous: SharingPolicy[]) => previous.filter((item: SharingPolicy) => item.id !== policy.id));
    },
    onUpdate: (policy: SharingPolicy, request: SharingPolicyUpdateRequest): void => {
      action('onUpdate', JSON.stringify(request));
      setPolicies((previous: SharingPolicy[]) =>
        previous.map((item: SharingPolicy) =>
          item.id === policy.id ? {...item, ...request, version: request.version + 1} : item,
        ),
      );
    },
    policies,
  };
};

export const ProjectDetailsSample = ({
  action,
  args,
  custom,
}: {
  action: Action;
  args: Args;
  custom: boolean;
}): ReactElement => {
  const [project, setProject] = useState<Project>(SAMPLE_PROJECTS[1]);

  return (
    <BaseProjectDetails
      project={project}
      isLoading={bool(args, 'isLoading')}
      error={str(args, 'error') || null}
      onUpdate={
        bool(args, 'editable')
          ? (changes: ProjectUpdateSubmission) => {
              action('onUpdate', JSON.stringify(changes));
              setProject({...project, ...changes});
            }
          : undefined
      }
      onDelete={bool(args, 'deletable') ? () => action('onDelete', project.id) : undefined}
    >
      {custom ? MuiProjectCard : undefined}
    </BaseProjectDetails>
  );
};

export const ProjectSwitcherSample = ({action, custom}: {action: Action; custom: boolean}): ReactElement => {
  const [current, setCurrent] = useState<Project | null>(SAMPLE_PROJECTS[0]);
  const [loaded, setLoaded] = useState<number>(2);

  return (
    <BaseProjectSwitcher
      projects={SAMPLE_PROJECTS.slice(0, loaded)}
      totalResults={SAMPLE_PROJECTS.length}
      currentProject={current}
      onLoadMore={
        loaded < SAMPLE_PROJECTS.length
          ? () => {
              action('onLoadMore');
              setLoaded(SAMPLE_PROJECTS.length);
            }
          : undefined
      }
      onSelect={(project: Project | null) => {
        action('onSelect', project?.id ?? 'null');
        setCurrent(project);
      }}
    >
      {custom ? MuiProjectSwitcher : undefined}
    </BaseProjectSwitcher>
  );
};

export const UnitDetailsSample = ({
  action,
  args,
  custom,
}: {
  action: Action;
  args: Args;
  custom: boolean;
}): ReactElement => {
  const [unit, setUnit] = useState<OrganizationUnit>(SAMPLE_UNIT);

  return (
    <BaseOrganizationUnitDetails
      organizationUnit={unit}
      parent={SAMPLE_UNIT_PARENT}
      contents={SAMPLE_CONTENTS}
      isLoading={bool(args, 'isLoading')}
      error={str(args, 'error') || null}
      onSelectChild={(child: OrganizationUnitBasic) => action('onSelectChild', child.id)}
      onUpdate={
        bool(args, 'editable')
          ? (changes: OrganizationUnitUpdateSubmission) => {
              action('onUpdate', JSON.stringify(changes));
              setUnit({...unit, ...changes});
            }
          : undefined
      }
      onDelete={bool(args, 'deletable') ? () => action('onDelete', unit.id) : undefined}
    >
      {custom ? MuiOrganizationUnitCard : undefined}
    </BaseOrganizationUnitDetails>
  );
};

export const SharingSample = ({action, args, custom}: {action: Action; args: Args; custom: boolean}): ReactElement => {
  const {onCreate, onDelete, onUpdate, policies} = useSamplePolicies(action);
  const editable: boolean = bool(args, 'editable');
  const ouId: string = str(args, 'ouId');

  return (
    <BaseSharingPolicies
      policies={policies}
      isLoading={bool(args, 'isLoading')}
      error={str(args, 'error') || null}
      onCreate={editable ? onCreate : undefined}
      onUpdate={editable ? onUpdate : undefined}
      onDelete={editable ? onDelete : undefined}
      overlayOuId={ouId || undefined}
      overlay={ouId ? {...SAMPLE_OVERLAY, ouId} : undefined}
    >
      {custom ? MuiSharingPolicies : undefined}
    </BaseSharingPolicies>
  );
};
