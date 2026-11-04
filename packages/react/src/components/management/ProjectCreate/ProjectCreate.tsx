// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CreateProjectRequest,
  OrganizationUnitQueryKeys,
  PROJECT_ERROR_KEYS,
  Project,
  ProjectQueryKeys,
  createProject,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseProjectCreate, {BaseProjectCreateProps, ProjectCreateSubmission} from './BaseProjectCreate';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useTranslation from '../../../hooks/useTranslation';

export type ProjectCreateProps = Omit<BaseProjectCreateProps, 'error' | 'isSubmitting' | 'onSubmit'> & {
  /**
   * Called with the created project.
   */
  onCreated?: (project: Project) => void;
};

/**
 * Creates a project through the control plane's management API.
 *
 * @example
 * ```tsx
 * <ProjectCreate onCreated={(project) => navigate(`/projects/${project.id}`)} />
 * ```
 */
const ProjectCreate: FC<ProjectCreateProps> = ({onCreated, preferences, ...rest}: ProjectCreateProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const endpoint: ManagementEndpoint = useManagementEndpoint('projects');
  const {error, isLoading, mutate}: ResourceMutationResult<Project, CreateProjectRequest> = useResourceMutation(
    (payload: CreateProjectRequest, fetcher) => createProject({...endpoint, fetcher, payload}),
    () => [[ProjectQueryKeys.PROJECTS], [OrganizationUnitQueryKeys.ORGANIZATION_UNITS]],
    {onSuccess: onCreated},
  );

  const handleSubmit = (submission: ProjectCreateSubmission): void => {
    void mutate(submission);
  };

  return (
    <BaseProjectCreate
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.projects.create.error', PROJECT_ERROR_KEYS)}
      preferences={preferences}
      {...rest}
    />
  );
};

export default ProjectCreate;
