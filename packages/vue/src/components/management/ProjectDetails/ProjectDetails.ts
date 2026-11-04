// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  OrganizationUnitQueryKeys,
  PROJECT_ERROR_KEYS,
  ProjectQueryKeys,
  deleteProject,
  getProject,
  toManagementErrorMessage,
  updateProject,
} from '@thunderid/browser';
import type {Preferences, Project, UpdateProjectRequest} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h, inject} from 'vue';
import BaseProjectDetails, {type ProjectUpdateSubmission} from './BaseProjectDetails';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import {THUNDERID_KEY} from '../../../keys';
import type {ThunderIDContext} from '../../../models/contexts';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type ProjectDetailsProps = Readonly<{
  className: string;
  deletable: boolean;
  editable: boolean;
  preferences: Preferences | undefined;
  projectId: string;
}>;

/**
 * Shows a project, and lets the signed-in user edit and delete it. Deleting the current project clears
 * it. Emits `updated` with the project as the server stored it after an edit, and `deleted` after it
 * has been deleted.
 *
 * Slots: `actions`, rendered next to the project's name; `default`, a scoped slot that replaces the view with custom
 * UI.
 *
 * @example
 * ```vue
 * <ProjectDetails :project-id="projectId" editable deletable @deleted="router.push('/projects')" />
 * ```
 */
const ProjectDetails: Component = defineComponent({
  name: 'ProjectDetails',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /**
     * Whether the project can be deleted from this view.
     */
    deletable: {default: false, type: Boolean},
    /** Whether the display name and description can be edited from this view. */
    editable: {default: false, type: Boolean},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Identifier of the project to show. */
    projectId: {required: true, type: String},
  },
  emits: ['deleted', 'updated'],
  setup(props: ProjectDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const thunderID: ThunderIDContext | null = inject(THUNDERID_KEY, null);
    const endpoint: ManagementEndpoint = useManagementEndpoint('projects');
    const project: ResourceQueryResult<Project> = useResourceQuery(
      () => [ProjectQueryKeys.PROJECT, props.projectId],
      (fetcher) => getProject({...endpoint, fetcher, projectId: props.projectId}),
      {enabled: (): boolean => Boolean(props.projectId)},
    );
    const update: ResourceMutationResult<Project, UpdateProjectRequest> = useResourceMutation(
      (payload: UpdateProjectRequest, fetcher) =>
        updateProject({...endpoint, fetcher, payload, projectId: props.projectId}),
      () => [[ProjectQueryKeys.PROJECTS], [ProjectQueryKeys.PROJECT, props.projectId]],
      {
        onSuccess: (updated: Project): void => {
          if (thunderID?.currentProject?.value?.id === updated.id) {
            thunderID.setCurrentProject?.(updated);
          }
          emit('updated', updated);
        },
      },
    );
    const deletion: ResourceMutationResult<void, string> = useResourceMutation(
      (projectId: string, fetcher) => deleteProject({...endpoint, fetcher, projectId}),
      () => [[ProjectQueryKeys.PROJECTS], [OrganizationUnitQueryKeys.ORGANIZATION_UNITS]],
      {
        onSuccess: (_: void, projectId: string): void => {
          if (thunderID?.currentProject?.value?.id === projectId) {
            thunderID.setCurrentProject?.(null);
          }
          emit('deleted');
        },
      },
    );

    return (): VNode =>
      h(
        BaseProjectDetails,
        {
          className: props.className,
          error:
            toManagementErrorMessage(t, project.error.value, 'admin.projects.details.error') ??
            toManagementErrorMessage(t, update.error.value, 'admin.projects.details.edit.error', PROJECT_ERROR_KEYS) ??
            toManagementErrorMessage(
              t,
              deletion.error.value,
              'admin.projects.details.delete.error',
              PROJECT_ERROR_KEYS,
            ),
          isDeleting: deletion.isLoading.value,
          isLoading: project.isLoading.value,
          isUpdating: update.isLoading.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.projectId) : undefined,
          onUpdate:
            props.editable && project.data.value
              ? (changes: ProjectUpdateSubmission): void =>
                  void update.mutate({...changes, handle: project.data.value?.handle})
              : undefined,
          preferences: props.preferences,
          project: project.data.value,
        },
        {...slots},
      );
  },
});

export default ProjectDetails;
