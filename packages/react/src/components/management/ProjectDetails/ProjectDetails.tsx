// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  OrganizationUnitQueryKeys,
  PROJECT_ERROR_KEYS,
  Project,
  ProjectQueryKeys,
  UpdateProjectRequest,
  deleteProject,
  getProject,
  toManagementErrorMessage,
  updateProject,
} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseProjectDetails, {BaseProjectDetailsProps, ProjectUpdateSubmission} from './BaseProjectDetails';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type ProjectDetailsProps = Omit<
  BaseProjectDetailsProps,
  'error' | 'isDeleting' | 'isLoading' | 'isUpdating' | 'onDelete' | 'onUpdate' | 'project'
> & {
  /**
   * Whether the project can be deleted from this view. Deleting asks for confirmation.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether the display name and description can be edited from this view.
   * @default false
   */
  editable?: boolean;
  /**
   * Called after the project has been deleted.
   */
  onDeleted?: () => void;
  /**
   * Called with the project as the server stored it after an edit.
   */
  onUpdated?: (project: Project) => void;
  projectId: string;
};

/**
 * Shows a project, and lets the signed-in user edit and delete it. Deleting the current project
 * clears it.
 *
 * @example
 * ```tsx
 * <ProjectDetails projectId={projectId} editable deletable onDeleted={() => navigate('/projects')} />
 * ```
 */
const ProjectDetails: FC<ProjectDetailsProps> = ({
  deletable = false,
  editable = false,
  onDeleted,
  onUpdated,
  preferences,
  projectId,
  ...rest
}: ProjectDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const {currentProject, setCurrentProject} = useThunderID();
  const endpoint: ManagementEndpoint = useManagementEndpoint('projects');
  const project: ResourceQueryResult<Project> = useResourceQuery(
    [ProjectQueryKeys.PROJECT, projectId],
    (fetcher) => getProject({...endpoint, fetcher, projectId}),
    {enabled: Boolean(projectId)},
  );
  const update: ResourceMutationResult<Project, UpdateProjectRequest> = useResourceMutation(
    (payload: UpdateProjectRequest, fetcher) => updateProject({...endpoint, fetcher, payload, projectId}),
    () => [[ProjectQueryKeys.PROJECTS], [ProjectQueryKeys.PROJECT, projectId]],
    {
      onSuccess: (updated: Project): void => {
        if (currentProject?.id === updated.id) {
          setCurrentProject(updated);
        }
        onUpdated?.(updated);
      },
    },
  );
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string, fetcher) => deleteProject({...endpoint, fetcher, projectId: id}),
    () => [[ProjectQueryKeys.PROJECTS], [OrganizationUnitQueryKeys.ORGANIZATION_UNITS]],
    {
      onSuccess: (): void => {
        if (currentProject?.id === projectId) {
          setCurrentProject(null);
        }
        onDeleted?.();
      },
    },
  );

  return (
    <BaseProjectDetails
      project={project.data}
      isLoading={project.isLoading}
      error={
        toManagementErrorMessage(t, project.error, 'admin.projects.details.error') ??
        toManagementErrorMessage(t, update.error, 'admin.projects.details.edit.error', PROJECT_ERROR_KEYS) ??
        toManagementErrorMessage(t, deletion.error, 'admin.projects.details.delete.error')
      }
      isDeleting={deletion.isLoading}
      isUpdating={update.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(projectId) : undefined}
      onUpdate={
        editable && project.data
          ? (changes: ProjectUpdateSubmission): void => void update.mutate({...changes, handle: project.data?.handle})
          : undefined
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default ProjectDetails;
