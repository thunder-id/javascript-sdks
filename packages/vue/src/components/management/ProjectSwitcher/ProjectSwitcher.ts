// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ProjectQueryKeys, getProjects, toManagementErrorMessage} from '@thunderid/browser';
import type {Preferences, Project, ProjectListResponse} from '@thunderid/browser';
import {
  type Component,
  type ComputedRef,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  computed,
  defineComponent,
  h,
  inject,
  ref,
  watch,
} from 'vue';
import BaseProjectSwitcher from './BaseProjectSwitcher';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import {THUNDERID_KEY} from '../../../keys';
import type {ThunderIDContext} from '../../../models/contexts';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type ProjectSwitcherProps = Readonly<{
  className: string;
  label: string | undefined;
  limit: number;
  preferences: Preferences | undefined;
}>;

/**
 * Lists the projects and lets the user choose the current one. The choice is client-side context, not
 * a sign-in: it is kept per vendor in `localStorage` and exposed as `currentProject` and
 * `setCurrentProject` through `useThunderID()`. `ApplicationList` and `AgentList` list the current project,
 * and `ApplicationCreate` and `AgentCreate` place new resources in it when no organization unit is given;
 * other lists are not filtered by it. Emits `select` with the chosen project, or
 * `null`, after the choice is kept.
 *
 * Slots: `default`, a scoped slot that replaces the select with custom UI and receives `BaseProjectSwitcherRenderProps`.
 *
 * @example
 * ```vue
 * <ProjectSwitcher @select="(project) => router.push(project ? `/projects/${project.id}` : '/')" />
 * ```
 */
const ProjectSwitcher: Component = defineComponent({
  name: 'ProjectSwitcher',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Label of the select. Pass an empty string to hide it. */
    label: {default: undefined, type: String},
    /** Number of projects fetched per page. The server serves at most 100. */
    limit: {default: 100, type: Number},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  emits: ['select'],
  setup(props: ProjectSwitcherProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const thunderID: ThunderIDContext | null = inject(THUNDERID_KEY, null);
    const endpoint: ManagementEndpoint = useManagementEndpoint('projects');
    const offset: Ref<number> = ref(0);
    const pages: Ref<Record<number, Project[]>> = ref({});
    const query: ResourceQueryResult<ProjectListResponse> = useResourceQuery(
      () => [ProjectQueryKeys.PROJECTS, {limit: props.limit, offset: offset.value}],
      (fetcher) => getProjects({...endpoint, fetcher, limit: props.limit, offset: offset.value}),
    );

    watch(query.data, (data: ProjectListResponse | undefined) => {
      if (data) {
        pages.value = {...pages.value, [offset.value]: data.projects ?? []};
      }
    });

    const projects: ComputedRef<Project[]> = computed(() =>
      Object.keys(pages.value)
        .map(Number)
        .sort((a: number, b: number) => a - b)
        .flatMap((pageOffset: number) => pages.value[pageOffset] ?? []),
    );

    return (): VNode => {
      const totalResults: number = query.data.value?.totalResults ?? projects.value.length;

      return h(
        BaseProjectSwitcher,
        {
          className: props.className,
          currentProject: thunderID?.currentProject?.value ?? null,
          error: toManagementErrorMessage(t, query.error.value, 'admin.projects.switcher.error'),
          isLoading: query.isLoading.value,
          label: props.label,
          onLoadMore:
            !query.isLoading.value && projects.value.length < totalResults
              ? (): void => {
                  offset.value = projects.value.length;
                }
              : undefined,
          onSelect: (project: Project | null): void => {
            thunderID?.setCurrentProject?.(project);
            emit('select', project);
          },
          preferences: props.preferences,
          projects: projects.value,
          totalResults,
        },
        {...slots},
      );
    };
  },
});

export default ProjectSwitcher;
