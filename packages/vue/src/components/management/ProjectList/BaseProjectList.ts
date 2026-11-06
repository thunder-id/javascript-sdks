// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Project} from '@thunderid/browser';
import {type Component, type VNodeChild} from 'vue';
import createAdminList from '../shared/createAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * Lists projects with their handle and description. Holds no data of its own: pass the page of
 * projects and handle selection and pagination.
 *
 * Props: `projects` (required), `selectedProjectId`, `isLoading`, `error`, `limit`, `offset`, `totalResults`,
 * `onPageChange`, `onSelect` (`@select`), `title`, `description`, `className`, `preferences`.
 * Slots: `actions`, rendered next to the title; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` plus `projects`.
 */
const BaseProjectList: Component = createAdminList<Project>({
  block: 'project-list',
  columns: (t: AdminTranslate) => [
    {
      header: t('admin.projects.fields.display_name'),
      id: 'displayName',
      render: (project: Project): VNodeChild => project.displayName,
    },
    {header: t('admin.projects.fields.handle'), id: 'handle', render: (project: Project): VNodeChild => project.handle},
    {
      header: t('admin.projects.fields.description'),
      id: 'description',
      render: (project: Project): VNodeChild => project.description ?? '',
    },
  ],
  emptyKey: 'admin.projects.list.empty',
  getRowId: (row: Project): string => row.id,
  name: 'BaseProjectList',
  rowsProp: 'projects',
  selectedProp: 'selectedProjectId',
  titleKey: 'admin.projects.list.title',
});

export default BaseProjectList;
