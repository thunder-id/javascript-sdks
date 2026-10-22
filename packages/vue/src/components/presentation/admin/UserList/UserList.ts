// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ApiFilteringParams, ManagedUser, ManagedUserListResponse} from '@thunderid/browser';
import type {Component} from 'vue';
import BaseUserList from './BaseUserList';
import useGetUsers from '../../../../composables/users/useGetUsers';
import createConnectedAdminList from '../shared/createConnectedAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * Lists the users the signed-in user is allowed to see, a page at a time.
 *
 * Props: `searchable` (default `true`; shows a search form the server matches exactly), `searchAttributes`, `filter` (server-side filter expression, for example `username sw "a"`), `limit`,
 * `selectedUserId`, `onSelect` (`@select`), `title`, `description`, `className`, `preferences`.
 * Slots: `actions`; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 *
 * @example
 * ```vue
 * <UserList @select="(user) => (selectedUserId = user.id)" />
 * ```
 */
const UserList: Component = createConnectedAdminList<ManagedUserListResponse, ManagedUser>({
  base: BaseUserList,
  errorKey: 'admin.users.list.error',
  extraProps: {filter: {default: undefined, type: String}},
  name: 'UserList',
  query: (params: () => Record<string, unknown>) => useGetUsers(() => params() as ApiFilteringParams),
  rows: (data: ManagedUserListResponse | undefined) => data?.users ?? [],
  rowsProp: 'users',
  searchAttributes: (t: AdminTranslate) => [
    {label: t('admin.users.list.search.username'), value: 'username'},
    {label: t('admin.users.list.search.email'), value: 'email'},
  ],
  selectedProp: 'selectedUserId',
  total: (data: ManagedUserListResponse | undefined) => data?.totalResults,
});

export default UserList;
