// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {OrganizationUnit, OrganizationUnitBasic, Project, SharingResourceType} from '@thunderid/browser';
import {
  BaseOrganizationUnitCreate,
  BaseOrganizationUnitList,
  BaseProjectCreate,
  BaseProjectList,
  OrganizationUnitCreate,
  type OrganizationUnitCreateSubmission,
  OrganizationUnitDetails,
  OrganizationUnitList,
  ProjectCreate,
  type ProjectCreateSubmission,
  ProjectDetails,
  ProjectList,
  ProjectSwitcher,
  SharingPolicies,
} from '@thunderid/vue';
import {h, type VNode} from 'vue';
import {SAMPLE_PROJECTS, SAMPLE_UNITS} from './managementAreaSamples';
import {
  CurrentProjectNote,
  primeOrganizationUnitForm,
  primeProjectForm,
  ProjectDetailsSample,
  ProjectSwitcherSample,
  SamplePagedList,
  SharingSample,
  UnitDetailsSample,
} from './ManagementAreaWidgets';
import {bool, num, str, tpl} from './storyKit';
import type {Action, Args, ComponentDef, PropControl, Snippet, StoryDef} from './types';
import {narrow} from './widgets';

// Stories for projects, organization units and sharing policies. Each has a Base variant with sample
// data, a Custom rendering variant drawn with PrimeVue through the default scoped slot, and a live
// variant that calls the management API with the signed-in user's token.

const AREA_SOURCE: PropControl = {
  control: ['base', 'live', 'custom'],
  description:
    'base renders the Base component with sample data; live uses the SDK context and the server; custom renders the Base component with sample data through its default scoped slot, drawn with PrimeVue.',
  name: 'source',
  type: "'base' | 'live' | 'custom' (playground only)",
};

const source = (args: Args): string => str(args, 'source');

const PRIME_TABLE_IMPORTS: string[] = [
  "import Column from 'primevue/column';",
  "import DataTable from 'primevue/datatable';",
];

const LIST_CONTROLS: PropControl[] = [
  AREA_SOURCE,
  {control: 'text', description: 'Heading; empty uses the translated default.', name: 'title', type: 'string'},
  {control: 'number', description: 'Rows per page.', name: 'limit', type: 'number'},
  {
    control: 'bool',
    description: 'Passes onSelect (`@select`), which makes rows choosable (playground toggle).',
    name: 'selectable',
    type: '(row) => void',
  },
  {control: 'bool', description: 'Base only: shows the loading row.', name: 'isLoading', type: 'boolean'},
  {control: 'text', description: 'Base only: error shown above the table.', name: 'error', type: 'string | null'},
  {control: 'bool', description: 'Base only: renders with no rows (playground only).', name: 'empty', type: 'boolean'},
];

const LIST_DEFAULTS: Args = {
  empty: false,
  error: '',
  isLoading: false,
  limit: 3,
  selectable: true,
  source: 'base',
  title: '',
};

const listStories = (live: string): StoryDef[] => [
  {id: 'base', name: 'Sample data'},
  {args: {isLoading: true}, id: 'loading', name: 'Loading'},
  {args: {error: 'You do not have permission to view this.'}, id: 'error', name: 'Error'},
  {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
  {args: {limit: 20, source: 'live'}, id: 'live', name: live},
];

/** The custom rendering snippet of a list: its slot props drawn as a PrimeVue DataTable. */
const primeListSnippet = (tag: string, rows: string, extra = ''): Snippet => ({
  imports: [tag],
  otherImports: PRIME_TABLE_IMPORTS,
  template: `<${tag}${extra} :limit="10" @select="(row) => router.push(row.id)">
  <template #default="{${rows}, columns, isLoading, limit, offset, totalResults, onPageChange, onSelect}">
    <DataTable
      :value="${rows}"
      lazy
      paginator
      :rows="limit"
      :first="offset"
      :total-records="totalResults"
      :loading="isLoading"
      selection-mode="single"
      @page="(event) => onPageChange?.(event.first)"
      @row-select="(event) => onSelect?.(event.data)"
    >
      <Column v-for="column in columns" :key="column.id" :field="column.id" :header="column.header">
        <template #body="{data}"><component :is="() => column.render(data)" /></template>
      </Column>
    </DataTable>
  </template>
</${tag}>`,
});

const needsId = (text: string): VNode => h('p', {class: 'pg-muted'}, text);

const listStory = (spec: {
  base: object;
  baseTag: string;
  extraControls?: PropControl[];
  extraDefaults?: Args;
  group: string;
  id: string;
  live: (args: Args, action: Action) => VNode;
  liveName: string;
  liveSnippet: (args: Args) => Snippet;
  name: string;
  rows: {id: string}[];
  rowsProp: string;
  selectedProp: string;
}): ComponentDef => ({
  code: (args: Args): Snippet => {
    if (source(args) === 'custom') return primeListSnippet(spec.name, spec.rowsProp);
    if (source(args) === 'live') return spec.liveSnippet(args);

    return {
      imports: [spec.baseTag],
      script: ['const offset = ref(0);'],
      template: tpl(
        spec.baseTag,
        {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
        {
          extra: [
            `:${spec.rowsProp.replace(/[A-Z]/g, (c: string) => `-${c.toLowerCase()}`)}="data.${spec.rowsProp}"`,
            ':total-results="data.totalResults"',
            ':offset="offset"',
            '@page-change="(next) => (offset = next)"',
          ],
        },
      ),
      vueImports: ['ref'],
    };
  },
  controls: [...LIST_CONTROLS, ...(spec.extraControls ?? [])],
  defaults: {...LIST_DEFAULTS, ...(spec.extraDefaults ?? {})},
  group: spec.group,
  id: spec.id,
  live: true,
  name: spec.name,
  render: (args: Args, action: Action): VNode =>
    narrow(
      720,
      source(args) === 'live'
        ? spec.live(args, action)
        : h(SamplePagedList, {
            action,
            args,
            base: spec.base,
            custom: source(args) === 'custom',
            key: `${source(args)}-${num(args, 'limit')}`,
            rows: spec.rows,
            rowsProp: spec.rowsProp,
            selectedProp: spec.selectedProp,
          }),
    ),
  stories: listStories(spec.liveName),
});

const detailsControls = (idName: string, noun: string): PropControl[] => [
  AREA_SOURCE,
  {control: 'text', description: `Live only: the ${noun} to load.`, name: idName, type: 'string'},
  {control: 'bool', description: 'Shows the edit action (onUpdate).', name: 'editable', type: 'boolean'},
  {control: 'bool', description: 'Shows the delete action (onDelete).', name: 'deletable', type: 'boolean'},
  {control: 'bool', description: 'Base only: shows the loading state.', name: 'isLoading', type: 'boolean'},
  {control: 'text', description: 'Base only: error shown above the overview.', name: 'error', type: 'string | null'},
];

export const PROJECT_STORIES: ComponentDef[] = [
  listStory({
    base: BaseProjectList,
    baseTag: 'BaseProjectList',
    group: 'Admin: projects',
    id: 'projectlist',
    live: (args: Args, action: Action): VNode =>
      h(ProjectList, {
        key: `live-${num(args, 'limit')}`,
        limit: Math.max(1, num(args, 'limit')),
        onSelect: bool(args, 'selectable') ? (project: Project): void => action('select', project.id) : undefined,
        title: str(args, 'title') || undefined,
      }),
    liveName: 'Live (control plane)',
    liveSnippet: (args: Args): Snippet => ({
      imports: ['ProjectList'],
      template: tpl(
        'ProjectList',
        {limit: num(args, 'limit'), title: str(args, 'title')},
        {
          defaults: {limit: 20},
          extra: bool(args, 'selectable') ? ['@select="(project) => router.push(project.id)"'] : [],
        },
      ),
    }),
    name: 'ProjectList',
    rows: SAMPLE_PROJECTS,
    rowsProp: 'projects',
    selectedProp: 'selectedProjectId',
  }),
  {
    code: (args: Args): Snippet => {
      if (source(args) === 'custom') {
        return {
          imports: ['ProjectCreate'],
          otherImports: ["import Button from 'primevue/button';", "import InputText from 'primevue/inputtext';"],
          template: `<ProjectCreate @created="(project) => router.push(project.id)">
  <template #default="{values, handleInputChange, handleSubmit, isValid, isSubmitting, error}">
    <Message v-if="error" severity="error">{{ error }}</Message>
    <InputText :model-value="values.handle" @update:model-value="(value) => handleInputChange('handle', value)" />
    <InputText :model-value="values.displayName" @update:model-value="(value) => handleInputChange('displayName', value)" />
    <Button label="Create project" :disabled="!isValid" :loading="isSubmitting" @click="handleSubmit" />
  </template>
</ProjectCreate>`,
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['ProjectCreate'],
            template: tpl('ProjectCreate', {}, {extra: ['@created="(project) => router.push(project.id)"']}),
          }
        : {
            imports: ['BaseProjectCreate'],
            template: tpl(
              'BaseProjectCreate',
              {error: str(args, 'error'), isSubmitting: bool(args, 'isSubmitting')},
              {extra: ['@submit="createProject"', '@cancel="close"']},
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
    render: (args: Args, action: Action): VNode =>
      narrow(
        480,
        source(args) === 'live'
          ? h(ProjectCreate, {onCreated: (project: Project): void => action('created', project.id)})
          : h(
              BaseProjectCreate,
              {
                error: str(args, 'error') || null,
                isSubmitting: bool(args, 'isSubmitting'),
                onCancel: (): void => action('cancel'),
                onSubmit: (project: ProjectCreateSubmission): void => action('submit', JSON.stringify(project)),
              },
              source(args) === 'custom' ? {default: primeProjectForm} : undefined,
            ),
      ),
    stories: [
      {id: 'base', name: 'Empty form'},
      {args: {error: 'Another project already uses this handle or identifier.'}, id: 'error', name: 'Error'},
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live (control plane)'},
    ],
  },
  {
    code: (args: Args): Snippet => {
      if (source(args) === 'custom') {
        return {
          imports: ['ProjectDetails'],
          otherImports: ["import Button from 'primevue/button';", "import Card from 'primevue/card';"],
          template: `<ProjectDetails :project-id="projectId" editable deletable>
  <template #default="{project, onUpdate, onDelete, error}">
    <Card>
      <template #title>{{ project?.displayName }}</template>
      <template #subtitle>{{ project?.handle }}</template>
      <template #content>{{ error ?? project?.description }}</template>
      <template #footer>
        <Button v-if="onUpdate" label="Rename" text @click="onUpdate({displayName: 'Renamed'})" />
        <!-- Ask before deleting: the custom render owns the confirmation. -->
        <Button v-if="onDelete" label="Delete" severity="danger" text @click="confirm('Delete?') && onDelete()" />
      </template>
    </Card>
  </template>
</ProjectDetails>`,
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['ProjectDetails'],
            template: tpl(
              'ProjectDetails',
              {deletable: bool(args, 'deletable'), editable: bool(args, 'editable'), projectId: str(args, 'projectId')},
              {extra: ['@deleted="backToList"']},
            ),
          }
        : {
            imports: ['BaseProjectDetails'],
            template: tpl(
              'BaseProjectDetails',
              {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
              {
                extra: [
                  ':project="project"',
                  ...(bool(args, 'editable') ? ['@update="saveProject"'] : []),
                  ...(bool(args, 'deletable') ? ['@delete="deleteProject"'] : []),
                ],
              },
            ),
          };
    },
    controls: detailsControls('projectId', 'project'),
    defaults: {deletable: true, editable: true, error: '', isLoading: false, projectId: '', source: 'base'},
    group: 'Admin: projects',
    id: 'projectdetails',
    live: true,
    name: 'ProjectDetails',
    render: (args: Args, action: Action): VNode => {
      if (source(args) === 'live') {
        if (!str(args, 'projectId')) return needsId('Set the projectId control to a project from your control plane.');

        return narrow(
          560,
          h(ProjectDetails, {
            deletable: bool(args, 'deletable'),
            editable: bool(args, 'editable'),
            key: str(args, 'projectId'),
            onDeleted: (): void => action('deleted'),
            onUpdated: (project: Project): void => action('updated', project.id),
            projectId: str(args, 'projectId'),
          }),
        );
      }

      return narrow(560, h(ProjectDetailsSample, {action, args, custom: source(args) === 'custom', key: source(args)}));
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
    code: (args: Args): Snippet => {
      if (source(args) === 'custom') {
        return {
          imports: ['ProjectSwitcher'],
          otherImports: ["import Select from 'primevue/select';"],
          template: `<ProjectSwitcher>
  <template #default="{projects, currentProject, onSelect}">
    <Select
      :model-value="currentProject?.id"
      :options="projects"
      option-label="displayName"
      option-value="id"
      show-clear
      @update:model-value="(id) => onSelect(projects.find((p) => p.id === id) ?? null)"
    />
  </template>
</ProjectSwitcher>`,
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['ProjectSwitcher', 'useThunderID'],
            script: ['const {currentProject, setCurrentProject} = useThunderID();'],
            template: `${tpl('ProjectSwitcher', {label: str(args, 'label')}, {extra: ['@select="(project) => router.push(project ? project.id : \'/\')"']})}
<p>{{ currentProject?.displayName }}</p>`,
          }
        : {
            imports: ['BaseProjectSwitcher'],
            template: tpl(
              'BaseProjectSwitcher',
              {label: str(args, 'label')},
              {
                extra: [
                  ':projects="projects"',
                  ':current-project="current"',
                  '@select="(project) => (current = project)"',
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
    render: (args: Args, action: Action): VNode =>
      narrow(
        420,
        source(args) === 'live'
          ? h('div', [
              h(ProjectSwitcher, {
                label: str(args, 'label') || undefined,
                onSelect: (project: Project | null): void => action('select', project?.id ?? 'null'),
              }),
              h(CurrentProjectNote),
            ])
          : h(ProjectSwitcherSample, {action, args, custom: source(args) === 'custom', key: source(args)}),
      ),
    stories: [
      {id: 'base', name: 'Sample projects'},
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live (sets the current project)'},
    ],
  },
];

export const ORGANIZATION_UNIT_ADMIN_STORIES: ComponentDef[] = [
  listStory({
    base: BaseOrganizationUnitList,
    baseTag: 'BaseOrganizationUnitList',
    extraControls: [
      {
        control: 'text',
        description: 'Live only: lists the children of this unit; empty lists the root units.',
        name: 'parentId',
        type: 'string',
      },
    ],
    extraDefaults: {parentId: ''},
    group: 'Admin: organization units',
    id: 'organizationunitlist',
    live: (args: Args, action: Action): VNode =>
      h(OrganizationUnitList, {
        key: `live-${num(args, 'limit')}-${str(args, 'parentId')}`,
        limit: Math.max(1, num(args, 'limit')),
        onSelect: bool(args, 'selectable')
          ? (unit: OrganizationUnitBasic): void => action('select', unit.id)
          : undefined,
        parentId: str(args, 'parentId') || undefined,
        title: str(args, 'title') || undefined,
      }),
    liveName: 'Live (root units)',
    liveSnippet: (args: Args): Snippet => ({
      imports: ['OrganizationUnitList'],
      template: tpl(
        'OrganizationUnitList',
        {limit: num(args, 'limit'), parentId: str(args, 'parentId'), title: str(args, 'title')},
        {defaults: {limit: 20}, extra: bool(args, 'selectable') ? ['@select="(unit) => router.push(unit.id)"'] : []},
      ),
    }),
    name: 'OrganizationUnitList',
    rows: SAMPLE_UNITS,
    rowsProp: 'organizationUnits',
    selectedProp: 'selectedOrganizationUnitId',
  }),
  {
    code: (args: Args): Snippet => {
      if (source(args) === 'custom') {
        return {
          imports: ['OrganizationUnitCreate'],
          otherImports: [
            "import Button from 'primevue/button';",
            "import InputText from 'primevue/inputtext';",
            "import Select from 'primevue/select';",
          ],
          template: `<OrganizationUnitCreate @created="(unit) => router.push(unit.id)">
  <template #default="{values, parentOptions, handleInputChange, handleSubmit, isValid, isSubmitting, error}">
    <Message v-if="error" severity="error">{{ error }}</Message>
    <InputText :model-value="values.name" @update:model-value="(value) => handleInputChange('name', value)" />
    <InputText :model-value="values.handle" @update:model-value="(value) => handleInputChange('handle', value)" />
    <Select
      :model-value="values.parentId"
      :options="parentOptions"
      option-label="label"
      option-value="value"
      @update:model-value="(value) => handleInputChange('parentId', value ?? '')"
    />
    <Button label="Create" :disabled="!isValid" :loading="isSubmitting" @click="handleSubmit" />
  </template>
</OrganizationUnitCreate>`,
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['OrganizationUnitCreate'],
            template: tpl(
              'OrganizationUnitCreate',
              {parentId: str(args, 'parentId')},
              {extra: ['@created="(unit) => router.push(unit.id)"']},
            ),
          }
        : {
            imports: ['BaseOrganizationUnitCreate'],
            template: tpl(
              'BaseOrganizationUnitCreate',
              {error: str(args, 'error'), parentId: str(args, 'parentId')},
              {
                extra: [...(str(args, 'parentId') ? [] : [':parent-options="rootUnits"']), '@submit="createUnit"'],
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
    render: (args: Args, action: Action): VNode =>
      narrow(
        480,
        source(args) === 'live'
          ? h(OrganizationUnitCreate, {
              key: str(args, 'parentId'),
              onCreated: (unit: OrganizationUnit): void => action('created', unit.id),
              parentId: str(args, 'parentId') || undefined,
            })
          : h(
              BaseOrganizationUnitCreate,
              {
                defaultParentId: SAMPLE_UNITS[0].id,
                error: str(args, 'error') || null,
                key: `${source(args)}-${str(args, 'parentId')}`,
                onCancel: (): void => action('cancel'),
                onSubmit: (unit: OrganizationUnitCreateSubmission): void => action('submit', JSON.stringify(unit)),
                parentId: str(args, 'parentId') || undefined,
                parentOptions: SAMPLE_UNITS.map((unit: OrganizationUnitBasic) => ({label: unit.name, value: unit.id})),
              },
              source(args) === 'custom' ? {default: primeOrganizationUnitForm} : undefined,
            ),
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
    code: (args: Args): Snippet => {
      if (source(args) === 'custom') {
        return {
          imports: ['OrganizationUnitDetails'],
          otherImports: [
            "import Button from 'primevue/button';",
            "import Card from 'primevue/card';",
            "import Chip from 'primevue/chip';",
          ],
          template: `<OrganizationUnitDetails :organization-unit-id="unitId" deletable>
  <template #default="{organizationUnit, contents, onDelete}">
    <Card>
      <template #title>{{ organizationUnit?.name }}</template>
      <template #subtitle>{{ organizationUnit?.handle }}</template>
      <template #content>
        <Chip v-for="unit in contents.childUnits" :key="unit.id" :label="unit.name" />
        <Chip v-for="user in contents.users" :key="user.id" :label="user.display ?? user.id" />
      </template>
      <template #footer>
        <!-- Ask before deleting: the custom render owns the confirmation. -->
        <Button v-if="onDelete" label="Delete" severity="danger" text @click="confirm('Delete?') && onDelete()" />
      </template>
    </Card>
  </template>
</OrganizationUnitDetails>`,
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['OrganizationUnitDetails'],
            template: tpl(
              'OrganizationUnitDetails',
              {
                deletable: bool(args, 'deletable'),
                editable: bool(args, 'editable'),
                organizationUnitId: str(args, 'organizationUnitId'),
              },
              {extra: ['@deleted="backToList"']},
            ),
          }
        : {
            imports: ['BaseOrganizationUnitDetails'],
            template: tpl(
              'BaseOrganizationUnitDetails',
              {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
              {
                extra: [
                  ':organization-unit="unit"',
                  ':parent="parent"',
                  ':contents="{childUnits, users, groups, roles}"',
                  ...(bool(args, 'editable') ? ['@update="saveUnit"'] : []),
                  ...(bool(args, 'deletable') ? ['@delete="deleteUnit"'] : []),
                ],
              },
            ),
          };
    },
    controls: detailsControls('organizationUnitId', 'unit'),
    defaults: {deletable: true, editable: true, error: '', isLoading: false, organizationUnitId: '', source: 'base'},
    group: 'Admin: organization units',
    id: 'organizationunitdetails',
    live: true,
    name: 'OrganizationUnitDetails',
    render: (args: Args, action: Action): VNode => {
      if (source(args) === 'live') {
        if (!str(args, 'organizationUnitId'))
          return needsId('Set the organizationUnitId control to a unit from your server.');

        return narrow(
          640,
          h(OrganizationUnitDetails, {
            deletable: bool(args, 'deletable'),
            editable: bool(args, 'editable'),
            key: str(args, 'organizationUnitId'),
            onDeleted: (): void => action('deleted'),
            onSelectChild: (child: OrganizationUnitBasic): void => action('select-child', child.id),
            onUpdated: (unit: OrganizationUnit): void => action('updated', unit.id),
            organizationUnitId: str(args, 'organizationUnitId'),
          }),
        );
      }

      return narrow(640, h(UnitDetailsSample, {action, args, custom: source(args) === 'custom', key: source(args)}));
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

export const SHARING_STORIES: ComponentDef[] = [
  {
    code: (args: Args): Snippet => {
      const target = `resource-type="${str(args, 'resourceType')}" :resource-id="${str(args, 'resourceType')}Id"`;

      if (source(args) === 'custom') {
        return {
          imports: ['SharingPolicies'],
          otherImports: ["import Button from 'primevue/button';", "import Chip from 'primevue/chip';"],
          template: `<SharingPolicies ${target} editable>
  <template #default="{policies, describeScope, onCreate, onDelete, isSubmitting}">
    <div v-for="policy in policies" :key="policy.id">
      {{ describeScope(policy).join(' · ') }} (version {{ policy.version }})
      <Chip v-if="policy.isReadOnly" label="Read only" />
      <!-- Ask before deleting: the custom render owns the confirmation. -->
      <Button v-else-if="onDelete" label="Delete" severity="danger" text @click="confirm('Delete this policy?') && onDelete(policy)" />
    </div>
    <Button v-if="onCreate" label="Share with every child unit" :loading="isSubmitting" @click="onCreate({childUnits: {mode: 'all'}})" />
  </template>
</SharingPolicies>`,
        };
      }

      return source(args) === 'live'
        ? {
            imports: ['SharingPolicies'],
            template: tpl(
              'SharingPolicies',
              {editable: bool(args, 'editable'), ouId: str(args, 'ouId')},
              {extra: [target]},
            ),
          }
        : {
            imports: ['BaseSharingPolicies'],
            template: tpl(
              'BaseSharingPolicies',
              {error: str(args, 'error'), isLoading: bool(args, 'isLoading')},
              {
                extra: [
                  ':policies="policies"',
                  ...(bool(args, 'editable') ? ['@create="create"', '@update="update"', '@delete="remove"'] : []),
                  ...(str(args, 'ouId') ? [`overlay-ou-id="${str(args, 'ouId')}"`, ':overlay="overlay"'] : []),
                ],
              },
            ),
          };
    },
    controls: [
      AREA_SOURCE,
      {
        control: ['user', 'application', 'role', 'flow'],
        description: 'The kind of resource whose sharing policies are shown (live).',
        name: 'resourceType',
        type: "'user' | 'application' | 'role' | 'flow'",
      },
      {control: 'text', description: 'Live only: the resource to load.', name: 'resourceId', type: 'string'},
      {
        control: 'text',
        description: 'Shows the overlay rules that apply in this organization unit, read only.',
        name: 'ouId',
        type: 'string',
      },
      {
        control: 'bool',
        description: 'Allows adding, editing and deleting policies (onCreate, onUpdate, onDelete).',
        name: 'editable',
        type: 'boolean',
      },
      {control: 'bool', description: 'Base only: shows the loading row.', name: 'isLoading', type: 'boolean'},
      {control: 'text', description: 'Base only: error shown in the table.', name: 'error', type: 'string | null'},
    ],
    defaults: {
      editable: true,
      error: '',
      isLoading: false,
      ouId: '',
      resourceId: '',
      resourceType: 'role',
      source: 'base',
    },
    group: 'Admin: sharing',
    id: 'sharingpolicies',
    live: true,
    name: 'SharingPolicies',
    render: (args: Args, action: Action): VNode => {
      if (source(args) === 'live') {
        if (!str(args, 'resourceId')) {
          return needsId(`Set the resourceId control to a ${str(args, 'resourceType')} from your server.`);
        }

        return narrow(
          720,
          h(SharingPolicies, {
            editable: bool(args, 'editable'),
            key: `${str(args, 'resourceType')}-${str(args, 'resourceId')}`,
            ouId: str(args, 'ouId') || undefined,
            resourceId: str(args, 'resourceId'),
            resourceType: str(args, 'resourceType') as SharingResourceType,
          }),
        );
      }

      return narrow(720, h(SharingSample, {action, args, custom: source(args) === 'custom', key: source(args)}));
    },
    stories: [
      {id: 'base', name: 'Sample policies'},
      {args: {editable: false}, id: 'readonly', name: 'Read only'},
      {args: {ouId: 'ou_sales'}, id: 'overlay', name: 'With overlay rules'},
      {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs resourceId)'},
    ],
  },
];
