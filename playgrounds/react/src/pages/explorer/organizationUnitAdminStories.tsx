// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {OrganizationUnit, OrganizationUnitBasic} from '@thunderid/browser';
import {
  BaseOrganizationUnitCreate,
  BaseOrganizationUnitList,
  OrganizationUnitCreate,
  OrganizationUnitDetails,
  OrganizationUnitList,
  type OrganizationUnitCreateSubmission,
} from '@thunderid/react';
import {SAMPLE_UNITS} from './managementAreaSamples';
import {
  AREA_SOURCE,
  LIST_AREA_CONTROLS,
  LIST_AREA_DEFAULTS,
  listAreaStories,
  muiListSnippet,
  source,
} from './managementAreaStoryKit';
import {MuiListGrid, MuiOrganizationUnitForm, SamplePaged, UnitDetailsSample} from './ManagementAreaWidgets';
import {bool, jsx, num, str} from './storyHelpers';
import {Narrow} from './StoryWidgets';
import type {Action, Args, ComponentDef} from './types';

export const ORGANIZATION_UNIT_ADMIN_STORIES: ComponentDef[] = [
  {
    code: (args: Args) => {
      const parent: string = str(args, 'parentId') ? ` parentId="${str(args, 'parentId')}"` : '';

      if (source(args) === 'custom') return muiListSnippet('OrganizationUnitList', 'organizationUnits', parent);
      if (source(args) === 'live') {
        return {
          imports: ['OrganizationUnitList'],
          jsx: jsx(
            'OrganizationUnitList',
            {limit: num(args, 'limit'), parentId: str(args, 'parentId'), title: str(args, 'title')},
            {
              defaults: {limit: 20},
              extra: bool(args, 'selectable') ? ['onSelect={(unit) => navigate(unit.id)}'] : [],
            },
          ),
        };
      }

      return {
        imports: ['BaseOrganizationUnitList'],
        jsx: jsx(
          'BaseOrganizationUnitList',
          {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
          {
            extra: [
              'organizationUnits={data.organizationUnits}',
              'totalResults={data.totalResults}',
              'offset={offset}',
              'onPageChange={setOffset}',
            ],
          },
        ),
      };
    },
    controls: [
      ...LIST_AREA_CONTROLS,
      {
        control: 'text',
        description: 'Live only: lists the children of this unit; empty lists the root units.',
        name: 'parentId',
        type: 'string',
      },
    ],
    defaults: {...LIST_AREA_DEFAULTS, parentId: ''},
    group: 'Admin: organization units',
    id: 'organizationunitlist',
    live: true,
    name: 'OrganizationUnitList',
    render: (args: Args, action: Action) => {
      if (source(args) === 'live') {
        return (
          <Narrow width={720}>
            <OrganizationUnitList
              limit={Math.max(1, num(args, 'limit'))}
              parentId={str(args, 'parentId') || undefined}
              title={str(args, 'title') || undefined}
              onSelect={
                bool(args, 'selectable') ? (unit: OrganizationUnitBasic) => action('onSelect', unit.id) : undefined
              }
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={720}>
          <SamplePaged<OrganizationUnitBasic>
            action={action}
            args={args}
            rows={SAMPLE_UNITS}
            render={(state) => (
              <BaseOrganizationUnitList
                organizationUnits={state.rows}
                totalResults={state.total}
                limit={state.limit}
                offset={state.offset}
                onPageChange={state.onPageChange}
                onSelect={state.onSelect}
                selectedOrganizationUnitId={state.selectedId}
                isLoading={bool(args, 'isLoading')}
                error={str(args, 'error') || null}
                title={str(args, 'title') || undefined}
              >
                {source(args) === 'custom' ? MuiListGrid : undefined}
              </BaseOrganizationUnitList>
            )}
          />
        </Narrow>
      );
    },
    stories: listAreaStories('Live (root units)'),
  },
  {
    code: (args: Args) => {
      if (source(args) === 'custom') {
        return {
          imports: ['OrganizationUnitCreate'],
          jsx: `<OrganizationUnitCreate onCreated={(unit) => navigate(unit.id)}>
  {({values, parentOptions, handleInputChange, handleSubmit, isValid, isSubmitting, error}) => (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Name" value={values.name} onChange={(e) => handleInputChange('name', e.target.value)} />
      <TextField label="Handle" value={values.handle} onChange={(e) => handleInputChange('handle', e.target.value)} />
      <TextField select label="Parent" value={values.parentId} onChange={(e) => handleInputChange('parentId', e.target.value)}>
        <MenuItem value="">None (top level)</MenuItem>
        {parentOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </TextField>
      <Button variant="contained" disabled={!isValid} loading={isSubmitting} onClick={handleSubmit}>Create</Button>
    </Stack>
  )}
</OrganizationUnitCreate>`,
          otherImports: ["import {Alert, Button, MenuItem, Stack, TextField} from '@mui/material';"],
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['OrganizationUnitCreate'],
            jsx: jsx(
              'OrganizationUnitCreate',
              {parentId: str(args, 'parentId')},
              {
                extra: ['onCreated={(unit) => navigate(unit.id)}'],
              },
            ),
          }
        : {
            imports: ['BaseOrganizationUnitCreate'],
            jsx: jsx(
              'BaseOrganizationUnitCreate',
              {error: str(args, 'error'), parentId: str(args, 'parentId')},
              {
                extra: [...(str(args, 'parentId') ? [] : ['parentOptions={rootUnits}']), 'onSubmit={createUnit}'],
              },
            ),
          };
    },
    controls: [
      AREA_SOURCE,
      {
        control: 'text',
        description: 'Fixes the parent and hides the picker. Empty offers the root units.',
        name: 'parentId',
        type: 'string',
      },
      {control: 'text', description: 'Base only: error shown above the form.', name: 'error', type: 'string | null'},
    ],
    defaults: {error: '', parentId: '', source: 'base'},
    group: 'Admin: organization units',
    id: 'organizationunitcreate',
    live: true,
    name: 'OrganizationUnitCreate',
    render: (args: Args, action: Action) => (
      <Narrow width={480}>
        {source(args) === 'live' ? (
          <OrganizationUnitCreate
            parentId={str(args, 'parentId') || undefined}
            onCreated={(unit: OrganizationUnit) => action('onCreated', unit.id)}
          />
        ) : (
          <BaseOrganizationUnitCreate
            parentId={str(args, 'parentId') || undefined}
            parentOptions={SAMPLE_UNITS.map((unit: OrganizationUnitBasic) => ({label: unit.name, value: unit.id}))}
            defaultParentId={SAMPLE_UNITS[0].id}
            error={str(args, 'error') || null}
            onSubmit={(unit: OrganizationUnitCreateSubmission) => action('onSubmit', JSON.stringify(unit))}
            onCancel={() => action('onCancel')}
          >
            {source(args) === 'custom' ? MuiOrganizationUnitForm : undefined}
          </BaseOrganizationUnitCreate>
        )}
      </Narrow>
    ),
    stories: [
      {id: 'base', name: 'Parent picker'},
      {args: {parentId: 'ou_eng'}, id: 'fixed', name: 'Fixed parent'},
      {
        args: {error: 'Another unit under the same parent already uses this name or handle.'},
        id: 'error',
        name: 'Error',
      },
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live'},
    ],
  },
  {
    code: (args: Args) => {
      if (source(args) === 'custom') {
        return {
          imports: ['OrganizationUnitDetails'],
          jsx: `<OrganizationUnitDetails organizationUnitId={unitId} deletable>
  {({organizationUnit, contents, onDelete}) => (
    <Card>
      <CardHeader title={organizationUnit?.name} subheader={organizationUnit?.handle} />
      <CardContent>
        {contents.childUnits.map((unit) => <Chip key={unit.id} color="primary" label={unit.name} />)}
        {contents.users.map((user) => <Chip key={user.id} label={user.display ?? user.id} />)}
      </CardContent>
      {/* Ask before deleting: the custom render owns the confirmation. */}
      {onDelete && <Button color="error" onClick={() => confirm('Delete?') && onDelete()}>Delete</Button>}
    </Card>
  )}
</OrganizationUnitDetails>`,
          otherImports: ["import {Button, Card, CardContent, CardHeader, Chip} from '@mui/material';"],
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['OrganizationUnitDetails'],
            jsx: jsx(
              'OrganizationUnitDetails',
              {
                deletable: bool(args, 'deletable'),
                editable: bool(args, 'editable'),
                organizationUnitId: str(args, 'organizationUnitId'),
              },
              {extra: ['onDeleted={backToList}']},
            ),
          }
        : {
            imports: ['BaseOrganizationUnitDetails'],
            jsx: jsx(
              'BaseOrganizationUnitDetails',
              {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
              {
                extra: [
                  'organizationUnit={unit}',
                  'parent={parent}',
                  'contents={{childUnits, users, groups, roles}}',
                  ...(bool(args, 'editable') ? ['onUpdate={saveUnit}'] : []),
                  ...(bool(args, 'deletable') ? ['onDelete={deleteUnit}'] : []),
                ],
              },
            ),
          };
    },
    controls: [
      AREA_SOURCE,
      {control: 'text', description: 'Live only: the unit to load.', name: 'organizationUnitId', type: 'string'},
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
    defaults: {deletable: true, editable: true, error: '', isLoading: false, organizationUnitId: '', source: 'base'},
    group: 'Admin: organization units',
    id: 'organizationunitdetails',
    live: true,
    name: 'OrganizationUnitDetails',
    render: (args: Args, action: Action) => {
      if (source(args) === 'live') {
        if (!str(args, 'organizationUnitId')) {
          return <Narrow width={420}>Set the organizationUnitId control to a unit from your server.</Narrow>;
        }

        return (
          <Narrow width={640}>
            <OrganizationUnitDetails
              organizationUnitId={str(args, 'organizationUnitId')}
              editable={bool(args, 'editable')}
              deletable={bool(args, 'deletable')}
              onSelectChild={(child: OrganizationUnitBasic) => action('onSelectChild', child.id)}
              onDeleted={() => action('onDeleted')}
              onUpdated={(unit: OrganizationUnit) => action('onUpdated', unit.id)}
            />
          </Narrow>
        );
      }

      return (
        <Narrow width={640}>
          <UnitDetailsSample action={action} args={args} custom={source(args) === 'custom'} />
        </Narrow>
      );
    },
    stories: [
      {id: 'base', name: 'Sample unit'},
      {args: {deletable: false, editable: false}, id: 'readonly', name: 'Read only'},
      {
        args: {
          error: 'This unit still holds child units, users, groups or other resources. Remove them before deleting it.',
        },
        id: 'refused',
        name: 'Delete refused',
      },
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs organizationUnitId)'},
    ],
  },
];
