// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveManagedIdentityName} from '@thunderid/browser';
import {type ManagedUser, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type VNodeChild, h} from 'vue';
import AdminAvatar from '../shared/AdminAvatar';
import createAdminList from '../shared/createAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * Lists users with their type and organization unit. Holds no data of its own: pass the page of
 * users and handle selection and pagination.
 *
 * Props: `users` (required), `selectedUserId`, `isLoading`, `error`, `limit`, `offset`, `totalResults`,
 * `onPageChange`, `onSelect` (`@select`), `title`, `description`, `className`, `preferences`.
 * Slots: `actions`, rendered next to the title, such as a button that opens `UserCreate`; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 */
const BaseUserList: Component = createAdminList<ManagedUser>({
  block: 'user-list',
  columns: (t: AdminTranslate) => [
    {
      header: t('admin.users.list.columns.name'),
      id: 'name',
      render: (user: ManagedUser): VNodeChild =>
        h('span', {class: withVendorCSSClassPrefix('admin__name')}, [
          h(AdminAvatar, {name: resolveManagedIdentityName(user), size: 28}),
          resolveManagedIdentityName(user),
        ]),
    },
    {header: t('admin.users.list.columns.type'), id: 'type', render: (user: ManagedUser): VNodeChild => user.type},
    {
      header: t('admin.common.columns.organization_unit'),
      id: 'ou',
      render: (user: ManagedUser): VNodeChild => user.ouHandle ?? user.ouId,
    },
  ],
  emptyKey: 'admin.users.list.empty',
  getRowId: (user: ManagedUser): string => user.id,
  name: 'BaseUserList',
  rowsProp: 'users',
  selectedProp: 'selectedUserId',
  titleKey: 'admin.users.list.title',
});

export default BaseUserList;
