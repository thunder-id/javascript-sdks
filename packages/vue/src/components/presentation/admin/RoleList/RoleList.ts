// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {RoleListResponse, RoleSummary} from '@thunderid/browser';
import type {Component} from 'vue';
import BaseRoleList from './BaseRoleList';
import useGetRoles from '../../../../composables/roles/useGetRoles';
import createConnectedAdminList from '../shared/createConnectedAdminList';

/**
 * Lists the roles the signed-in user is allowed to see, a page at a time.
 *
 * Props: `limit`, `selectedRoleId`, `onSelect` (`@select`), `title`, `description`, `className`,
 * `preferences`. Slots: `actions`; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 *
 * @example
 * ```vue
 * <RoleList @select="(role) => (selectedRoleId = role.id)" />
 * ```
 */
const RoleList: Component = createConnectedAdminList<RoleListResponse, RoleSummary>({
  base: BaseRoleList,
  errorKey: 'admin.roles.list.error',
  name: 'RoleList',
  query: (params: () => Record<string, unknown>) => useGetRoles(() => params() as {limit?: number; offset?: number}),
  rows: (data: RoleListResponse | undefined) => data?.roles ?? [],
  rowsProp: 'roles',
  selectedProp: 'selectedRoleId',
  total: (data: RoleListResponse | undefined) => data?.totalResults,
});

export default RoleList;
