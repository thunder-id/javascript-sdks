// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type RoleSummary} from '@thunderid/browser';
import {type Component, type VNodeChild} from 'vue';
import createAdminList from '../shared/createAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * Lists roles with their description and organization unit. Holds no data of its own: pass the
 * page of roles and handle selection and pagination.
 *
 * Props: `roles` (required), `selectedRoleId`, `isLoading`, `error`, `limit`, `offset`, `totalResults`,
 * `onPageChange`, `onSelect` (`@select`), `title`, `description`, `className`, `preferences`.
 * Slots: `actions`, rendered next to the title; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 */
const BaseRoleList: Component = createAdminList<RoleSummary>({
  block: 'role-list',
  columns: (t: AdminTranslate) => [
    {header: t('admin.roles.list.columns.name'), id: 'name', render: (role: RoleSummary): VNodeChild => role.name},
    {
      header: t('admin.roles.list.columns.description'),
      id: 'description',
      render: (role: RoleSummary): VNodeChild => role.description ?? '',
    },
    {
      header: t('admin.common.columns.organization_unit'),
      id: 'ou',
      render: (role: RoleSummary): VNodeChild => role.ouHandle ?? role.ouId,
    },
  ],
  emptyKey: 'admin.roles.list.empty',
  getRowId: (row: RoleSummary): string => row.id,
  name: 'BaseRoleList',
  rowsProp: 'roles',
  selectedProp: 'selectedRoleId',
  titleKey: 'admin.roles.list.title',
});

export default BaseRoleList;
