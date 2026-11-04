// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ProjectQueryKeys, getProjects} from '@thunderid/browser';
import type {Project, ProjectListResponse} from '@thunderid/browser';
import type {Component} from 'vue';
import BaseProjectList from './BaseProjectList';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import createConnectedAdminList from '../shared/createConnectedAdminList';

/**
 * Lists the projects, a page at a time. Projects are served by the control plane only.
 *
 * Props: `limit`, `selectedProjectId`, `onSelect` (`@select`), `title`, `description`, `className`,
 * `preferences`. Slots: `actions`; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` plus `projects`.
 *
 * @example
 * ```vue
 * <ProjectList @select="(project) => (selectedProjectId = project.id)" />
 * ```
 */
const ProjectList: Component = createConnectedAdminList<ProjectListResponse, Project>({
  base: BaseProjectList,
  errorKey: 'admin.projects.list.error',
  name: 'ProjectList',
  query: (params: () => Record<string, unknown>): ResourceQueryResult<ProjectListResponse> => {
    const endpoint: ManagementEndpoint = useManagementEndpoint('projects');

    return useResourceQuery(
      () => {
        const {limit, offset} = params() as {limit?: number; offset?: number};

        return [ProjectQueryKeys.PROJECTS, {limit, offset}];
      },
      (fetcher) => {
        const {limit, offset} = params() as {limit?: number; offset?: number};

        return getProjects({...endpoint, fetcher, limit, offset});
      },
    );
  },
  rows: (data: ProjectListResponse | undefined) => data?.projects ?? [],
  rowsProp: 'projects',
  selectedProp: 'selectedProjectId',
  total: (data: ProjectListResponse | undefined) => data?.totalResults,
});

export default ProjectList;
