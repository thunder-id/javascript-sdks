// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, getGroups} from '@thunderid/browser';
import type {GroupListResponse, Group} from '@thunderid/browser';
import type {Component} from 'vue';
import BaseGroupList from './BaseGroupList';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
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
  query: (params: () => Record<string, unknown>): ResourceQueryResult<GroupListResponse> => {
    const endpoint: ManagementEndpoint = useManagementEndpoint('groups');

    return useResourceQuery(
      () => {
        const {limit, offset} = params() as {limit?: number; offset?: number};

        return [GroupQueryKeys.GROUPS, {limit, offset}];
      },
      (fetcher) => {
        const {limit, offset} = params() as {limit?: number; offset?: number};

        return getGroups({...endpoint, fetcher, limit, offset});
      },
    );
  },
  rows: (data: GroupListResponse | undefined) => data?.groups ?? [],
  rowsProp: 'groups',
  selectedProp: 'selectedGroupId',
  total: (data: GroupListResponse | undefined) => data?.totalResults,
});

export default GroupList;
