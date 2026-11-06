// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// Story components are small stateful wrappers that live next to the PrimeVue renderers they use.
/* eslint-disable vue/one-component-per-file */

import type {
  OrganizationUnit,
  OrganizationUnitBasic,
  Project,
  SelectOption,
  SharingPolicy,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
} from '@thunderid/browser';
import {
  type AdminListRenderProps,
  type BaseOrganizationUnitCreateRenderProps,
  type BaseOrganizationUnitDetailsRenderProps,
  type BaseProjectCreateRenderProps,
  type BaseProjectDetailsRenderProps,
  type BaseProjectSwitcherRenderProps,
  type BaseSharingPoliciesRenderProps,
  type DataTableColumn,
  type OrganizationUnitUpdateSubmission,
  type ProjectUpdateSubmission,
} from '@thunderid/vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Chip from 'primevue/chip';
import Column from 'primevue/column';
import DataTable, {type DataTablePageEvent, type DataTableRowSelectEvent} from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import {defineComponent, h, ref, type Component, type PropType, type Ref, type VNode, type VNodeChild} from 'vue';
import {
  SAMPLE_CONTENTS,
  SAMPLE_OVERLAY,
  SAMPLE_POLICIES,
  SAMPLE_PROJECTS,
  SAMPLE_UNIT,
  SAMPLE_UNIT_PARENT,
} from './managementAreaSamples';
import {PrimeTheme} from './primeRenderers';
import type {Action, Args} from './storyTypes';
import {BaseOrganizationUnitDetails, BaseProjectDetails, BaseProjectSwitcher, BaseSharingPolicies} from '#components';
import {useThunderID} from '#imports';

const str = (args: Args, key: string): string => String(args[key] ?? '');
const bool = (args: Args, key: string): boolean => args[key] === true;
const num = (args: Args, key: string): number => Number(args[key] ?? 0);
const quoted = (value: unknown): string => `"${String(value)}"`;

/** Asks before a delete, since a custom render owns the confirmation. */
const confirmed = (question: string): boolean => window.confirm(question);

const field = (label: string, value: string, onInput: (next: string) => void): VNode =>
  h('label', {class: 'pg-prime-field'}, [
    h('span', label),
    h(InputText, {modelValue: value, 'onUpdate:modelValue': (next: string | undefined) => onInput(next ?? '')}),
  ]);

const errorMessage = (error: string | null | undefined): VNode | null =>
  error ? h(Message, {severity: 'error'}, {default: () => error}) : null;

/** Wraps custom renders in the PrimeVue theme that follows the preview's light or dark mode. */
export const prime = (child: VNodeChild): VNode => h(PrimeTheme, null, {default: () => child});

/**
 * A list's default scoped slot drawn as a PrimeVue DataTable: the SDK's columns become table columns,
 * and the table's lazy paging maps onto the SDK's offset paging.
 */
export const primeTable = <T extends {id?: string}>(state: AdminListRenderProps<T>): VNode =>
  prime(
    h('div', {class: 'pg-prime-stack'}, [
      errorMessage(state.error),
      h(
        DataTable,
        {
          dataKey: 'id',
          first: state.offset,
          lazy: true,
          loading: state.isLoading,
          onPage: (event: DataTablePageEvent) => state.onPageChange?.(event.first),
          onRowSelect: (event: DataTableRowSelectEvent) => state.onSelect?.(event.data as T),
          paginator: Boolean(state.onPageChange),
          rows: state.limit,
          selection: state.rows.find((row: T) => row.id === state.selectedRowId),
          selectionMode: state.onSelect ? 'single' : undefined,
          size: 'small',
          totalRecords: state.totalResults,
          value: state.rows,
        },
        {
          default: () =>
            state.columns.map((column: DataTableColumn<T>) =>
              h(
                Column,
                {field: column.id, header: column.header, key: column.id},
                {body: ({data}: {data: T}) => column.render(data)},
              ),
            ),
        },
      ),
    ]),
  );

/**
 * Pages and selects sample rows the way an application holding the data would, and renders a Base list
 * with them, drawn by the built-in UI or, with `custom`, by PrimeVue through the default scoped slot.
 */
export const SamplePagedList: Component = defineComponent({
  name: 'SamplePagedList',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    args: {required: true, type: Object as PropType<Args>},
    base: {required: true, type: Object as PropType<Component>},
    custom: {default: false, type: Boolean},
    rows: {required: true, type: Array as PropType<{id: string}[]>},
    rowsProp: {required: true, type: String},
    selectedProp: {required: true, type: String},
  },
  setup(props: {
    action: Action;
    args: Args;
    base: Component;
    custom: boolean;
    rows: {id: string}[];
    rowsProp: string;
    selectedProp: string;
  }): () => VNode {
    const offset: Ref<number> = ref(0);
    const selected: Ref<string | undefined> = ref();

    return (): VNode => {
      const limit: number = Math.max(1, num(props.args, 'limit'));
      const rows: {id: string}[] = bool(props.args, 'empty') ? [] : props.rows;

      return h(
        props.base,
        {
          error: str(props.args, 'error') || null,
          isLoading: bool(props.args, 'isLoading'),
          limit,
          offset: offset.value,
          onPageChange: (next: number): void => {
            offset.value = next;
            props.action('page-change', String(next));
          },
          onSelect: bool(props.args, 'selectable')
            ? (row: {id: string}): void => {
                selected.value = row.id;
                props.action('select', quoted(row.id));
              }
            : undefined,
          [props.rowsProp]: rows.slice(offset.value, offset.value + limit),
          [props.selectedProp]: selected.value,
          title: str(props.args, 'title') || undefined,
          totalResults: rows.length,
        },
        props.custom ? {default: (state: AdminListRenderProps<{id: string}>): VNode => primeTable(state)} : undefined,
      );
    };
  },
});

/** The project form's default scoped slot drawn with PrimeVue inputs. */
export const primeProjectForm = (state: BaseProjectCreateRenderProps): VNode =>
  prime(
    h(
      Card,
      {},
      {
        content: () =>
          h('div', {class: 'pg-prime-stack'}, [
            errorMessage(state.error),
            field('Handle *', state.values.handle, (value: string) => state.handleInputChange('handle', value)),
            field('Display name *', state.values.displayName, (value: string) =>
              state.handleInputChange('displayName', value),
            ),
            field('Description', state.values.description, (value: string) =>
              state.handleInputChange('description', value),
            ),
          ]),
        footer: () =>
          h('div', {class: 'pg-prime-actions'}, [
            state.onCancel
              ? h(Button, {label: 'Cancel', onClick: state.onCancel, severity: 'secondary', text: true})
              : null,
            h(Button, {
              disabled: !state.isValid || state.isSubmitting,
              label: 'Create project',
              loading: state.isSubmitting,
              onClick: state.handleSubmit,
            }),
          ]),
        title: () => 'New project',
      },
    ),
  );

/** The organization unit form's default scoped slot drawn with PrimeVue inputs. */
export const primeOrganizationUnitForm = (state: BaseOrganizationUnitCreateRenderProps): VNode =>
  prime(
    h(
      Card,
      {},
      {
        content: () =>
          h('div', {class: 'pg-prime-stack'}, [
            errorMessage(state.error),
            field('Name *', state.values.name, (value: string) => state.handleInputChange('name', value)),
            field('Handle *', state.values.handle, (value: string) => state.handleInputChange('handle', value)),
            state.parentOptions.length
              ? h('label', {class: 'pg-prime-field'}, [
                  h('span', 'Parent'),
                  h(Select, {
                    loading: state.isLoadingParents,
                    modelValue: state.values.parentId,
                    optionLabel: 'label',
                    optionValue: 'value',
                    options: [{label: 'None (top level)', value: ''}, ...state.parentOptions] as SelectOption[],
                    'onUpdate:modelValue': (value: string) => state.handleInputChange('parentId', value ?? ''),
                  }),
                ])
              : null,
          ]),
        footer: () =>
          h('div', {class: 'pg-prime-actions'}, [
            state.onCancel
              ? h(Button, {label: 'Cancel', onClick: state.onCancel, severity: 'secondary', text: true})
              : null,
            h(Button, {
              disabled: !state.isValid || state.isSubmitting,
              label: 'Create unit',
              loading: state.isSubmitting,
              onClick: state.handleSubmit,
            }),
          ]),
        title: () => 'New organization unit',
      },
    ),
  );

/** The project details' default scoped slot drawn as a PrimeVue card. */
export const primeProjectCard = (state: BaseProjectDetailsRenderProps): VNode =>
  prime(
    h(
      Card,
      {},
      {
        content: () =>
          h('div', {class: 'pg-prime-stack'}, [
            errorMessage(state.error),
            h('span', state.project?.description ?? ''),
            h(Chip, {label: `Created ${state.project?.createdAt ?? ''}`}),
          ]),
        footer: () =>
          h('div', {class: 'pg-prime-actions'}, [
            state.onUpdate
              ? h(Button, {
                  label: 'Rename',
                  loading: state.isUpdating,
                  onClick: () =>
                    state.onUpdate?.({
                      description: state.project?.description,
                      displayName: `${state.project?.displayName ?? ''} (renamed)`,
                    }),
                  text: true,
                })
              : null,
            state.onDelete
              ? h(Button, {
                  label: 'Delete',
                  loading: state.isDeleting,
                  onClick: () => confirmed(`Delete ${state.project?.displayName ?? ''}?`) && state.onDelete?.(),
                  severity: 'danger',
                  text: true,
                })
              : null,
          ]),
        subtitle: () => state.project?.handle ?? '',
        title: () => state.project?.displayName ?? '',
      },
    ),
  );

/** The organization unit details' default scoped slot drawn as a PrimeVue card. */
export const primeUnitCard = (state: BaseOrganizationUnitDetailsRenderProps): VNode =>
  prime(
    h(
      Card,
      {},
      {
        content: () =>
          h('div', {class: 'pg-prime-stack'}, [
            errorMessage(state.error),
            h('span', `Parent: ${state.parent?.name ?? state.organizationUnit?.parent ?? 'none'}`),
            h('div', {class: 'pg-prime-chips'}, [
              ...state.contents.childUnits.map((unit: OrganizationUnitBasic) =>
                h(Chip, {key: unit.id, label: `Unit: ${unit.name}`, onClick: () => state.onSelectChild?.(unit)}),
              ),
              ...state.contents.users.map((user: {display?: string; id: string}) =>
                h(Chip, {key: user.id, label: user.display ?? user.id}),
              ),
              ...state.contents.groups.map((group: {id: string; name: string}) =>
                h(Chip, {key: group.id, label: `Group: ${group.name}`}),
              ),
              ...state.contents.roles.map((role: {id: string; name: string}) =>
                h(Chip, {key: role.id, label: `Role: ${role.name}`}),
              ),
            ]),
          ]),
        footer: () =>
          h('div', {class: 'pg-prime-actions'}, [
            state.onDelete
              ? h(Button, {
                  label: 'Delete',
                  loading: state.isDeleting,
                  onClick: () => confirmed(`Delete ${state.organizationUnit?.name ?? ''}?`) && state.onDelete?.(),
                  severity: 'danger',
                  text: true,
                })
              : null,
          ]),
        subtitle: () => state.organizationUnit?.handle ?? '',
        title: () => state.organizationUnit?.name ?? '',
      },
    ),
  );

/** The project switcher's default scoped slot drawn as a PrimeVue Select. */
export const primeProjectSelect = (state: BaseProjectSwitcherRenderProps): VNode =>
  prime(
    h('div', {class: 'pg-prime-stack'}, [
      errorMessage(state.error),
      h('label', {class: 'pg-prime-field'}, [
        h('span', 'Project'),
        h(Select, {
          loading: state.isLoading,
          modelValue: state.currentProject?.id ?? '',
          optionLabel: 'label',
          optionValue: 'value',
          options: [
            {label: 'No project', value: ''},
            ...state.projects.map((project: Project) => ({label: project.displayName, value: project.id})),
          ],
          'onUpdate:modelValue': (value: string) =>
            state.onSelect(state.projects.find((project: Project) => project.id === value) ?? null),
        }),
      ]),
      state.onLoadMore ? h(Button, {label: 'Load more', onClick: state.onLoadMore, size: 'small', text: true}) : null,
    ]),
  );

/** The sharing policies' default scoped slot drawn as a PrimeVue list of cards. */
export const primeSharingList = (state: BaseSharingPoliciesRenderProps): VNode =>
  prime(
    h('div', {class: 'pg-prime-stack'}, [
      errorMessage(state.error ?? state.mutationError),
      ...state.policies.map((policy: SharingPolicy) =>
        h('div', {class: 'pg-prime-actions', key: policy.id}, [
          h(
            'span',
            {style: 'flex: 1'},
            `${state.describeScope(policy).join(' · ')} (version ${policy.version ?? '-'})`,
          ),
          policy.isReadOnly
            ? h(Chip, {label: 'Read only'})
            : state.onDelete
              ? h(Button, {
                  label: 'Delete',
                  onClick: () => confirmed('Delete this policy?') && state.onDelete?.(policy),
                  severity: 'danger',
                  size: 'small',
                  text: true,
                })
              : null,
        ]),
      ),
      state.onCreate
        ? h(Button, {
            label: 'Share with every child unit',
            loading: state.isSubmitting,
            onClick: () => state.onCreate?.({childUnits: {mode: 'all'}}),
            size: 'small',
          })
        : null,
      state.overlayOuId && state.overlay
        ? h(
            Message,
            {severity: 'info'},
            {default: () => `Rules in ${state.overlayOuId}: ${JSON.stringify(state.overlay?.rules ?? {})}`},
          )
        : null,
    ]),
  );

/** BaseProjectDetails with a sample project that edits locally. */
export const ProjectDetailsSample: Component = defineComponent({
  name: 'ProjectDetailsSample',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    args: {required: true, type: Object as PropType<Args>},
    custom: {default: false, type: Boolean},
  },
  setup(props: {action: Action; args: Args; custom: boolean}): () => VNode {
    const project: Ref<Project> = ref({...SAMPLE_PROJECTS[1]});

    return (): VNode =>
      h(
        BaseProjectDetails,
        {
          error: str(props.args, 'error') || null,
          isLoading: bool(props.args, 'isLoading'),
          onDelete: bool(props.args, 'deletable')
            ? (): void => props.action('delete', quoted(project.value.id))
            : undefined,
          onUpdate: bool(props.args, 'editable')
            ? (changes: ProjectUpdateSubmission): void => {
                project.value = {...project.value, ...changes};
                props.action('update', JSON.stringify(changes));
              }
            : undefined,
          project: project.value,
        },
        props.custom ? {default: primeProjectCard} : undefined,
      );
  },
});

/** BaseProjectSwitcher with sample projects, loading two at a time and choosing locally. */
export const ProjectSwitcherSample: Component = defineComponent({
  name: 'ProjectSwitcherSample',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    args: {required: true, type: Object as PropType<Args>},
    custom: {default: false, type: Boolean},
  },
  setup(props: {action: Action; args: Args; custom: boolean}): () => VNode {
    const loaded: Ref<number> = ref(2);
    const current: Ref<Project | null> = ref(SAMPLE_PROJECTS[0]);

    return (): VNode =>
      h(
        BaseProjectSwitcher,
        {
          currentProject: current.value,
          label: str(props.args, 'label') || undefined,
          onLoadMore:
            loaded.value < SAMPLE_PROJECTS.length
              ? (): void => {
                  loaded.value += 2;
                  props.action('load-more', String(loaded.value));
                }
              : undefined,
          onSelect: (project: Project | null): void => {
            current.value = project;
            props.action('select', project ? quoted(project.id) : 'null');
          },
          projects: SAMPLE_PROJECTS.slice(0, loaded.value),
          totalResults: SAMPLE_PROJECTS.length,
        },
        props.custom ? {default: primeProjectSelect} : undefined,
      );
  },
});

/** Shows the current project from `useThunderID()`, which the live switcher sets. */
export const CurrentProjectNote: Component = defineComponent({
  name: 'CurrentProjectNote',
  setup(): () => VNode {
    const {currentProject} = useThunderID();

    return (): VNode =>
      h(
        'p',
        {class: 'pg-muted', style: 'margin-top: 12px'},
        `useThunderID().currentProject: ${currentProject?.value ? `${currentProject.value.displayName} (${currentProject.value.id})` : 'null'}. ApplicationList and AgentList list it, and ApplicationCreate and AgentCreate place new resources in it.`,
      );
  },
});

/** BaseOrganizationUnitDetails with a sample unit that edits locally. */
export const UnitDetailsSample: Component = defineComponent({
  name: 'UnitDetailsSample',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    args: {required: true, type: Object as PropType<Args>},
    custom: {default: false, type: Boolean},
  },
  setup(props: {action: Action; args: Args; custom: boolean}): () => VNode {
    const unit: Ref<OrganizationUnit> = ref({...SAMPLE_UNIT});

    return (): VNode =>
      h(
        BaseOrganizationUnitDetails,
        {
          contents: SAMPLE_CONTENTS,
          error: str(props.args, 'error') || null,
          isLoading: bool(props.args, 'isLoading'),
          onDelete: bool(props.args, 'deletable')
            ? (): void => props.action('delete', quoted(unit.value.id))
            : undefined,
          onSelectChild: (child: OrganizationUnitBasic): void => props.action('select-child', quoted(child.id)),
          onUpdate: bool(props.args, 'editable')
            ? (changes: OrganizationUnitUpdateSubmission): void => {
                unit.value = {...unit.value, ...changes};
                props.action('update', JSON.stringify(changes));
              }
            : undefined,
          organizationUnit: unit.value,
          parent: SAMPLE_UNIT_PARENT,
        },
        props.custom ? {default: primeUnitCard} : undefined,
      );
  },
});

/** BaseSharingPolicies with sample policies that change locally. */
export const SharingSample: Component = defineComponent({
  name: 'SharingSample',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    args: {required: true, type: Object as PropType<Args>},
    custom: {default: false, type: Boolean},
  },
  setup(props: {action: Action; args: Args; custom: boolean}): () => VNode {
    const policies: Ref<SharingPolicy[]> = ref([...SAMPLE_POLICIES]);
    let created = 0;

    return (): VNode => {
      const editable: boolean = bool(props.args, 'editable');
      const ouId: string = str(props.args, 'ouId');

      return h(
        BaseSharingPolicies,
        {
          error: str(props.args, 'error') || null,
          isLoading: bool(props.args, 'isLoading'),
          onCreate: editable
            ? (request: SharingPolicyRequest): void => {
                created += 1;
                policies.value = [
                  ...policies.value,
                  {...request, id: `pol_new_${created}`, stage: 'share', version: 1},
                ];
                props.action('create', JSON.stringify(request));
              }
            : undefined,
          onDelete: editable
            ? (policy: SharingPolicy): void => {
                policies.value = policies.value.filter((item: SharingPolicy) => item.id !== policy.id);
                props.action('delete', quoted(policy.id));
              }
            : undefined,
          onUpdate: editable
            ? (policy: SharingPolicy, request: SharingPolicyUpdateRequest): void => {
                policies.value = policies.value.map((item: SharingPolicy) =>
                  item.id === policy.id ? {...item, ...request, version: (item.version ?? 0) + 1} : item,
                );
                props.action('update', JSON.stringify(request));
              }
            : undefined,
          overlay: ouId ? {...SAMPLE_OVERLAY, ouId} : undefined,
          overlayOuId: ouId || undefined,
          policies: policies.value,
          totalResults: policies.value.length,
        },
        props.custom ? {default: primeSharingList} : undefined,
      );
    };
  },
});
