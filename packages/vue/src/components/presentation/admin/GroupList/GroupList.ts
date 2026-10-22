// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {GroupListResponse, Group} from '@thunderid/browser';
import type {Component} from 'vue';
import BaseGroupList from './BaseGroupList';
import useGetGroups from '../../../../composables/groups/useGetGroups';
import createConnectedAdminList from '../shared/createConnectedAdminList';

/**
 * Lists the groups the signed-in user is allowed to see, a page at a time.
 *
 * Props: `limit`, `selectedGroupId`, `onSelect` (`@select`), `title`, `description`, `className`,
 * `preferences`. Slots: `actions`; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 *
 * @example
 * ```vue
 * <GroupList @select="(group) => (selectedGroupId = group.id)" />
 * ```
 */
const GroupList: Component = createConnectedAdminList<GroupListResponse, Group>({
  base: BaseGroupList,
  errorKey: 'admin.groups.list.error',
  name: 'GroupList',
  query: (params: () => Record<string, unknown>) => useGetGroups(() => params() as {limit?: number; offset?: number}),
  rows: (data: GroupListResponse | undefined) => data?.groups ?? [],
  rowsProp: 'groups',
  selectedProp: 'selectedGroupId',
  total: (data: GroupListResponse | undefined) => data?.totalResults,
});

export default GroupList;
