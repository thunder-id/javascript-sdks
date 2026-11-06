// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {BasicApplication} from '@thunderid/browser';
import {type Component, type VNodeChild, h} from 'vue';
import createAdminList from '../shared/createAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The translated access status of an application, or its raw value when the status is one this SDK
 * does not know.
 */
const getStatusLabel = (application: BasicApplication, t: AdminTranslate): string => {
  const value: string | undefined = application.status?.value;

  switch (value?.toUpperCase()) {
    case 'ACTIVE':
      return t('admin.applications.status.active');
    case 'SUSPENDED':
      return t('admin.applications.status.suspended');
    default:
      return value ?? '';
  }
};

/**
 * Lists applications with their client identifier, type and, when the server reports it, access status. Holds no data of its own: pass the page
 * of applications and handle selection and pagination.
 *
 * Props: `applications` (required), `selectedApplicationId`, `isLoading`, `error`, `limit`, `offset`,
 * `totalResults`, `onPageChange`, `onSelect` (`@select`), `title`, `description`, `className`, `preferences`.
 * Slots: `actions`, rendered next to the title; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 */
const BaseApplicationList: Component = createAdminList<BasicApplication>({
  block: 'application-list',
  columns: (t: AdminTranslate, applications: BasicApplication[]) => [
    {
      header: t('admin.applications.list.columns.name'),
      id: 'name',
      render: (application: BasicApplication): VNodeChild => application.name,
    },
    {
      header: t('admin.applications.list.columns.client_id'),
      id: 'clientId',
      render: (application: BasicApplication): VNodeChild =>
        application.clientId ? h('code', {}, application.clientId) : null,
    },
    {
      header: t('admin.applications.list.columns.type'),
      id: 'type',
      render: (application: BasicApplication): VNodeChild => application.type ?? application.template ?? '',
    },
    // A server that does not report the access status gets no empty status column.
    ...(applications.some((application: BasicApplication) => application.status?.value)
      ? [
          {
            header: t('admin.applications.list.columns.status'),
            id: 'status',
            render: (application: BasicApplication): VNodeChild => getStatusLabel(application, t),
          },
        ]
      : []),
  ],
  emptyKey: 'admin.applications.list.empty',
  getRowId: (row: BasicApplication): string => row.id,
  name: 'BaseApplicationList',
  rowsProp: 'applications',
  selectedProp: 'selectedApplicationId',
  titleKey: 'admin.applications.list.title',
});

export default BaseApplicationList;
