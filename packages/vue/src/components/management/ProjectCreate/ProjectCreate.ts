// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  OrganizationUnitQueryKeys,
  PROJECT_ERROR_KEYS,
  ProjectQueryKeys,
  createProject,
  toManagementErrorMessage,
} from '@thunderid/browser';
import type {CreateProjectRequest, Project} from '@thunderid/browser';
import {type Component, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseProjectCreate, {type ProjectCreateSubmission} from './BaseProjectCreate';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import {type AdminFormProps, adminFormProps} from '../shared/adminFormProps';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type ProjectCreateProps = Omit<AdminFormProps, 'error' | 'isSubmitting'>;

/**
 * Creates a project through the control plane's management API. Emits `created` with the created project.
 *
 * @example
 * ```vue
 * <ProjectCreate @created="(project) => router.push(`/projects/${project.id}`)" />
 * ```
 */
const ProjectCreate: Component = defineComponent({
  name: 'ProjectCreate',
  props: {
    className: adminFormProps.className,
    description: adminFormProps.description,
    onCancel: adminFormProps.onCancel,
    preferences: adminFormProps.preferences,
    title: adminFormProps.title,
  },
  emits: ['created'],
  setup(props: ProjectCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('projects');
    const creation: ResourceMutationResult<Project, CreateProjectRequest> = useResourceMutation(
      (payload: CreateProjectRequest, fetcher) => createProject({...endpoint, fetcher, payload}),
      () => [[ProjectQueryKeys.PROJECTS], [OrganizationUnitQueryKeys.ORGANIZATION_UNITS]],
      {onSuccess: (created: Project): void => emit('created', created)},
    );

    return (): VNode =>
      h(
        BaseProjectCreate,
        {
          className: props.className,
          description: props.description,
          error: toManagementErrorMessage(t, creation.error.value, 'admin.projects.create.error', PROJECT_ERROR_KEYS),
          isSubmitting: creation.isLoading.value,
          onCancel: props.onCancel,
          onSubmit: (submission: ProjectCreateSubmission): void => void creation.mutate(submission),
          preferences: props.preferences,
          title: props.title,
        },
        {...slots},
      );
  },
});

export default ProjectCreate;
