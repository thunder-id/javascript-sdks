// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type OrganizationUnitBasic} from '@thunderid/browser';
import {type Component, type VNodeChild} from 'vue';
import createAdminList from '../shared/createAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * Lists organization units with their handle and description. Holds no data of its own: pass the
 * page of units and handle selection and pagination.
 *
 * Props: `organizationUnits` (required), `selectedOrganizationUnitId`, `isLoading`, `error`, `limit`, `offset`,
 * `totalResults`, `onPageChange`, `onSelect` (`@select`), `title`, `description`, `className`, `preferences`.
 * Slots: `actions`, rendered next to the title; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` plus `organizationUnits`.
 */
const BaseOrganizationUnitList: Component = createAdminList<OrganizationUnitBasic>({
  block: 'organization-unit-list',
  columns: (t: AdminTranslate) => [
    {
      header: t('admin.organization_units.fields.name'),
      id: 'name',
      render: (unit: OrganizationUnitBasic): VNodeChild => unit.name,
    },
    {
      header: t('admin.organization_units.fields.handle'),
      id: 'handle',
      render: (unit: OrganizationUnitBasic): VNodeChild => unit.handle,
    },
    {
      header: t('admin.organization_units.fields.description'),
      id: 'description',
      render: (unit: OrganizationUnitBasic): VNodeChild => unit.description ?? '',
    },
  ],
  emptyKey: 'admin.organization_units.list.empty',
  getRowId: (row: OrganizationUnitBasic): string => row.id,
  name: 'BaseOrganizationUnitList',
  rowsProp: 'organizationUnits',
  selectedProp: 'selectedOrganizationUnitId',
  titleKey: 'admin.organization_units.list.title',
});

export default BaseOrganizationUnitList;
