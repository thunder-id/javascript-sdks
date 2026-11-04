// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Project,
  ProjectListResponse,
  ProjectQueryKeys,
  getProjects,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useMemo, useState} from 'react';
import BaseProjectSwitcher, {BaseProjectSwitcherProps} from './BaseProjectSwitcher';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type ProjectSwitcherProps = Omit<
  BaseProjectSwitcherProps,
  'currentProject' | 'error' | 'isLoading' | 'onLoadMore' | 'projects' | 'totalResults'
> & {
  /**
   * Number of projects fetched per page. The server serves at most 100.
   * @default 100
   */
  limit?: number;
};

/**
 * Lists the projects and lets the user choose the current one. The choice is client-side context, not
 * a sign-in: it is kept per vendor in `localStorage` and exposed as `currentProject` and
 * `setCurrentProject` through `useThunderID()`. `ApplicationList` and `AgentList` list the current
 * project's applications and agents, and `ApplicationCreate` and `AgentCreate` create them in it, the
 * resources the server places by project. A project's identifier is not an organization unit's, so no
 * other component uses it. `onSelect` is called after the choice is kept.
 *
 * @example
 * ```tsx
 * <ProjectSwitcher onSelect={(project) => navigate(project ? `/projects/${project.id}` : '/')} />
 * ```
 */
const ProjectSwitcher: FC<ProjectSwitcherProps> = ({
  limit = 100,
  onSelect,
  preferences,
  ...rest
}: ProjectSwitcherProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const {currentProject, setCurrentProject} = useThunderID();
  const [offset, setOffset] = useState<number>(0);
  const [pages, setPages] = useState<Record<number, Project[]>>({});
  const endpoint: ManagementEndpoint = useManagementEndpoint('projects');
  const {data, error, isLoading}: ResourceQueryResult<ProjectListResponse> = useResourceQuery(
    [ProjectQueryKeys.PROJECTS, {limit, offset}],
    (fetcher) => getProjects({...endpoint, fetcher, limit, offset}),
  );

  const [mergedData, setMergedData] = useState<ProjectListResponse | undefined>(undefined);

  // Each page is kept as it arrives, so loading more appends to the projects already listed.
  if (data && data !== mergedData) {
    setMergedData(data);
    setPages((previous: Record<number, Project[]>) => ({...previous, [offset]: data.projects ?? []}));
  }

  const projects: Project[] = useMemo(
    () =>
      Object.keys(pages)
        .map(Number)
        .sort((a: number, b: number) => a - b)
        .flatMap((pageOffset: number) => pages[pageOffset] ?? []),
    [pages],
  );
  const totalResults: number = data?.totalResults ?? projects.length;

  return (
    <BaseProjectSwitcher
      currentProject={currentProject}
      projects={projects}
      totalResults={totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.projects.switcher.error')}
      onLoadMore={!isLoading && projects.length < totalResults ? (): void => setOffset(projects.length) : undefined}
      onSelect={(project: Project | null): void => {
        setCurrentProject(project);
        onSelect?.(project);
      }}
      preferences={preferences}
      {...rest}
    />
  );
};

export default ProjectSwitcher;
