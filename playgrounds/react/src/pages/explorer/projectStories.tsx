// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Project} from '@thunderid/browser';
import {
  BaseProjectCreate,
  BaseProjectList,
  ProjectCreate,
  ProjectDetails,
  ProjectList,
  ProjectSwitcher,
  type ProjectCreateSubmission,
} from '@thunderid/react';
import {SAMPLE_PROJECTS} from './managementAreaSamples';
import {
  AREA_SOURCE,
  LIST_AREA_CONTROLS,
  LIST_AREA_DEFAULTS,
  listAreaStories,
  muiListSnippet,
  source,
} from './managementAreaStoryKit';
import {
  CurrentProjectNote,
  MuiListGrid,
  MuiProjectForm,
  ProjectDetailsSample,
  ProjectSwitcherSample,
  SamplePaged,
} from './ManagementAreaWidgets';
import {bool, jsx, num, str} from './storyHelpers';
import {Narrow} from './StoryWidgets';
import type {Action, Args, ComponentDef} from './types';

export const PROJECT_STORIES: ComponentDef[] = [
  {
    code: (args: Args) => {
      if (source(args) === 'custom') return muiListSnippet('ProjectList', 'projects');
      if (source(args) === 'live') {
        return {
          imports: ['ProjectList'],
          jsx: jsx(
            'ProjectList',
            {limit: num(args, 'limit'), title: str(args, 'title')},
            {
              defaults: {limit: 20},
              extra: bool(args, 'selectable') ? ['onSelect={(project) => navigate(project.id)}'] : [],
            },
          ),
        };
      }

      return {
        imports: ['BaseProjectList'],
        jsx: jsx(
          'BaseProjectList',
          {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
          {
            extra: [
              'projects={data.projects}',
              'totalResults={data.totalResults}',
              'offset={offset}',
              'onPageChange={setOffset}',
            ],
          },
        ),
      };
    },
    controls: LIST_AREA_CONTROLS,
    defaults: LIST_AREA_DEFAULTS,
    group: 'Admin: projects',
    id: 'projectlist',
    live: true,
    name: 'ProjectList',
    render: (args: Args, action: Action) => {
      if (source(args) === 'live') {
        return (
          <Narrow width={720}>
            <ProjectList
              limit={Math.max(1, num(args, 'limit'))}
              title={str(args, 'title') || undefined}
              onSelect={bool(args, 'selectable') ? (project: Project) => action('onSelect', project.id) : undefined}
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={720}>
          <SamplePaged<Project>
            action={action}
            args={args}
            rows={SAMPLE_PROJECTS}
            render={(state) => (
              <BaseProjectList
                projects={state.rows}
                totalResults={state.total}
                limit={state.limit}
                offset={state.offset}
                onPageChange={state.onPageChange}
                onSelect={state.onSelect}
                selectedProjectId={state.selectedId}
                isLoading={bool(args, 'isLoading')}
                error={str(args, 'error') || null}
                title={str(args, 'title') || undefined}
              >
                {source(args) === 'custom' ? MuiListGrid : undefined}
              </BaseProjectList>
            )}
          />
        </Narrow>
      );
    },
    stories: listAreaStories('Live (control plane)'),
  },
  {
    code: (args: Args) => {
      if (source(args) === 'custom') {
        return {
          imports: ['ProjectCreate'],
          jsx: `<ProjectCreate onCreated={(project) => navigate(project.id)}>
  {({values, handleInputChange, handleSubmit, isValid, isSubmitting, error}) => (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Handle" value={values.handle} onChange={(e) => handleInputChange('handle', e.target.value)} />
      <TextField label="Display name" value={values.displayName} onChange={(e) => handleInputChange('displayName', e.target.value)} />
      <Button variant="contained" disabled={!isValid} loading={isSubmitting} onClick={handleSubmit}>Create</Button>
    </Stack>
  )}
</ProjectCreate>`,
          otherImports: ["import {Alert, Button, Stack, TextField} from '@mui/material';"],
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['ProjectCreate'],
            jsx: jsx('ProjectCreate', {}, {extra: ['onCreated={(project) => navigate(project.id)}']}),
          }
        : {
            imports: ['BaseProjectCreate'],
            jsx: jsx(
              'BaseProjectCreate',
              {error: str(args, 'error'), isSubmitting: bool(args, 'isSubmitting')},
              {
                extra: ['onSubmit={createProject}', 'onCancel={close}'],
              },
            ),
          };
    },
    controls: [
      AREA_SOURCE,
      {
        control: 'bool',
        description: 'Base only: shows the submit as in flight.',
        name: 'isSubmitting',
        type: 'boolean',
      },
      {control: 'text', description: 'Base only: error shown above the form.', name: 'error', type: 'string | null'},
    ],
    defaults: {error: '', isSubmitting: false, source: 'base'},
    group: 'Admin: projects',
    id: 'projectcreate',
    live: true,
    name: 'ProjectCreate',
    render: (args: Args, action: Action) => (
      <Narrow width={480}>
        {source(args) === 'live' ? (
          <ProjectCreate onCreated={(project: Project) => action('onCreated', project.id)} />
        ) : (
          <BaseProjectCreate
            error={str(args, 'error') || null}
            isSubmitting={bool(args, 'isSubmitting')}
            onSubmit={(project: ProjectCreateSubmission) => action('onSubmit', JSON.stringify(project))}
            onCancel={() => action('onCancel')}
          >
            {source(args) === 'custom' ? MuiProjectForm : undefined}
          </BaseProjectCreate>
        )}
      </Narrow>
    ),
    stories: [
      {id: 'base', name: 'Empty form'},
      {args: {error: 'Another project already uses this handle or identifier.'}, id: 'error', name: 'Error'},
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live (control plane)'},
    ],
  },
  {
    code: (args: Args) => {
      if (source(args) === 'custom') {
        return {
          imports: ['ProjectDetails'],
          jsx: `<ProjectDetails projectId={projectId} editable deletable>
  {({project, onUpdate, onDelete, error}) => (
    <Card>
      <CardHeader title={project?.displayName} subheader={project?.handle} />
      <CardContent>{error ? <Alert severity="error">{error}</Alert> : project?.description}</CardContent>
      {onUpdate && <Button onClick={() => onUpdate({displayName: 'Renamed'})}>Rename</Button>}
      {/* Ask before deleting: the custom render owns the confirmation. */}
      {onDelete && <Button color="error" onClick={() => confirm('Delete?') && onDelete()}>Delete</Button>}
    </Card>
  )}
</ProjectDetails>`,
          otherImports: ["import {Alert, Button, Card, CardContent, CardHeader} from '@mui/material';"],
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['ProjectDetails'],
            jsx: jsx(
              'ProjectDetails',
              {deletable: bool(args, 'deletable'), editable: bool(args, 'editable'), projectId: str(args, 'projectId')},
              {extra: ['onDeleted={backToList}']},
            ),
          }
        : {
            imports: ['BaseProjectDetails'],
            jsx: jsx(
              'BaseProjectDetails',
              {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
              {
                extra: [
                  'project={project}',
                  ...(bool(args, 'editable') ? ['onUpdate={saveProject}'] : []),
                  ...(bool(args, 'deletable') ? ['onDelete={deleteProject}'] : []),
                ],
              },
            ),
          };
    },
    controls: [
      AREA_SOURCE,
      {control: 'text', description: 'Live only: the project to load.', name: 'projectId', type: 'string'},
      {control: 'bool', description: 'Shows the edit action (onUpdate).', name: 'editable', type: 'boolean'},
      {control: 'bool', description: 'Shows the delete action (onDelete).', name: 'deletable', type: 'boolean'},
      {control: 'bool', description: 'Base only: shows the loading state.', name: 'isLoading', type: 'boolean'},
      {
        control: 'text',
        description: 'Base only: error shown above the overview.',
        name: 'error',
        type: 'string | null',
      },
    ],
    defaults: {deletable: true, editable: true, error: '', isLoading: false, projectId: '', source: 'base'},
    group: 'Admin: projects',
    id: 'projectdetails',
    live: true,
    name: 'ProjectDetails',
    render: (args: Args, action: Action) => {
      if (source(args) === 'live') {
        if (!str(args, 'projectId')) {
          return <Narrow width={420}>Set the projectId control to a project from your control plane.</Narrow>;
        }

        return (
          <Narrow width={560}>
            <ProjectDetails
              projectId={str(args, 'projectId')}
              editable={bool(args, 'editable')}
              deletable={bool(args, 'deletable')}
              onDeleted={() => action('onDeleted')}
              onUpdated={(project: Project) => action('onUpdated', project.id)}
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={560}>
          <ProjectDetailsSample action={action} args={args} custom={source(args) === 'custom'} />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Sample project'},
      {args: {deletable: false, editable: false}, id: 'readonly', name: 'Read only'},
      {args: {error: 'The project handle cannot be changed.'}, id: 'refused', name: 'Change refused'},
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs projectId)'},
    ],
  },
  {
    code: (args: Args) => {
      if (source(args) === 'custom') {
        return {
          imports: ['ProjectSwitcher'],
          jsx: `<ProjectSwitcher>
  {({projects, currentProject, onSelect, onLoadMore}) => (
    <TextField select label="Project" value={currentProject?.id ?? ''}
      onChange={(e) => onSelect(projects.find((p) => p.id === e.target.value) ?? null)}>
      <MenuItem value="">No project</MenuItem>
      {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.displayName}</MenuItem>)}
    </TextField>
  )}
</ProjectSwitcher>`,
          otherImports: ["import {MenuItem, TextField} from '@mui/material';"],
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['ProjectSwitcher', 'useThunderID'],
            jsx: `${jsx('ProjectSwitcher', {label: str(args, 'label')}, {extra: ['onSelect={(project) => navigate(project ? project.id : "/")}']})}
// Elsewhere: const {currentProject, setCurrentProject} = useThunderID();`,
          }
        : {
            imports: ['BaseProjectSwitcher'],
            jsx: jsx(
              'BaseProjectSwitcher',
              {label: str(args, 'label')},
              {
                extra: [
                  'projects={projects}',
                  'currentProject={current}',
                  'onSelect={setCurrent}',
                  'onLoadMore={loadMore}',
                ],
              },
            ),
          };
    },
    controls: [
      AREA_SOURCE,
      {control: 'text', description: 'Label; empty uses the translated default.', name: 'label', type: 'string'},
    ],
    defaults: {label: '', source: 'base'},
    group: 'Admin: projects',
    id: 'projectswitcher',
    live: true,
    name: 'ProjectSwitcher',
    render: (args: Args, action: Action) =>
      source(args) === 'live' ? (
        <Narrow width={420}>
          <ProjectSwitcher
            label={str(args, 'label') || undefined}
            onSelect={(project: Project | null) => action('onSelect', project?.id ?? 'null')}
          />
          <CurrentProjectNote />
        </Narrow>
      ) : (
        <Narrow width={420}>
          <ProjectSwitcherSample action={action} custom={source(args) === 'custom'} />
        </Narrow>
      ),
    stories: [
      {id: 'base', name: 'Sample projects'},
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live (sets the current project)'},
    ],
  },
];
