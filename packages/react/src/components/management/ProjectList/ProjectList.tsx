// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ProjectListResponse, ProjectQueryKeys, getProjects, toManagementErrorMessage} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseProjectList, {BaseProjectListProps} from './BaseProjectList';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type ProjectListProps = Omit<
  BaseProjectListProps,
  'error' | 'isLoading' | 'offset' | 'onPageChange' | 'projects' | 'totalResults'
>;

/**
 * Lists the projects, a page at a time. Projects are served by the control plane only.
 *
 * @example
 * ```tsx
 * <ProjectList onSelect={(project) => setSelectedProjectId(project.id)} />
 * ```
 */
const ProjectList: FC<ProjectListProps> = ({limit = 20, preferences, ...rest}: ProjectListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const endpoint: ManagementEndpoint = useManagementEndpoint('projects');
  const {data, error, isLoading}: ResourceQueryResult<ProjectListResponse> = useResourceQuery(
    [ProjectQueryKeys.PROJECTS, {limit, offset}],
    (fetcher) => getProjects({...endpoint, fetcher, limit, offset}),
  );

  return (
    <BaseProjectList
      projects={data?.projects ?? []}
      totalResults={data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.projects.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      preferences={preferences}
      {...rest}
    />
  );
};

export default ProjectList;
