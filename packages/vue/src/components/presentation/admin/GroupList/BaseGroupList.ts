// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Group} from '@thunderid/browser';
import {type Component, type VNodeChild} from 'vue';
import createAdminList from '../shared/createAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * Lists groups with their description and organization unit. Holds no data of its own: pass the
 * page of groups and handle selection and pagination.
 *
 * Props: `groups` (required), `selectedGroupId`, `isLoading`, `error`, `limit`, `offset`, `totalResults`,
 * `onPageChange`, `onSelect` (`@select`), `title`, `description`, `className`, `preferences`.
 * Slots: `actions`, rendered next to the title; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 */
const BaseGroupList: Component = createAdminList<Group>({
  block: 'group-list',
  columns: (t: AdminTranslate) => [
    {header: t('admin.groups.list.columns.name'), id: 'name', render: (group: Group): VNodeChild => group.name},
    {
      header: t('admin.groups.list.columns.description'),
      id: 'description',
      render: (group: Group): VNodeChild => group.description ?? '',
    },
    {
      header: t('admin.common.columns.organization_unit'),
      id: 'ou',
      render: (group: Group): VNodeChild => group.ouHandle ?? group.ouId,
    },
  ],
  emptyKey: 'admin.groups.list.empty',
  getRowId: (row: Group): string => row.id,
  name: 'BaseGroupList',
  rowsProp: 'groups',
  selectedProp: 'selectedGroupId',
  titleKey: 'admin.groups.list.title',
});

export default BaseGroupList;
