// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, getRoles} from '@thunderid/browser';
import type {RoleListResponse, RoleSummary} from '@thunderid/browser';
import type {Component} from 'vue';
import BaseRoleList from './BaseRoleList';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
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
  query: (params: () => Record<string, unknown>): ResourceQueryResult<RoleListResponse> => {
    const endpoint: ManagementEndpoint = useManagementEndpoint('roles');

    return useResourceQuery(
      () => {
        const {limit, offset} = params() as {limit?: number; offset?: number};

        return [RoleQueryKeys.ROLES, {limit, offset}];
      },
      (fetcher) => {
        const {limit, offset} = params() as {limit?: number; offset?: number};

        return getRoles({...endpoint, fetcher, limit, offset});
      },
    );
  },
  rows: (data: RoleListResponse | undefined) => data?.roles ?? [],
  rowsProp: 'roles',
  selectedProp: 'selectedRoleId',
  total: (data: RoleListResponse | undefined) => data?.totalResults,
});

export default RoleList;
