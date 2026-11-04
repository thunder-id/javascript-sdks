// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {OrganizationUnitQueryKeys, getOrganizationUnitChildren, getOrganizationUnits} from '@thunderid/browser';
import type {OrganizationUnitBasic, OrganizationUnitListResponse} from '@thunderid/browser';
import type {Component} from 'vue';
import BaseOrganizationUnitList from './BaseOrganizationUnitList';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import createConnectedAdminList from '../shared/createConnectedAdminList';

/**
 * Lists organization units, a page at a time: the root units, or the children of `parentId`.
 *
 * Props: `parentId`, `limit`, `selectedOrganizationUnitId`, `onSelect` (`@select`), `title`, `description`,
 * `className`, `preferences`. Slots: `actions`; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` plus `organizationUnits`.
 *
 * @example
 * ```vue
 * <OrganizationUnitList :parent-id="projectId" @select="(unit) => (selectedUnitId = unit.id)" />
 * ```
 */
const OrganizationUnitList: Component = createConnectedAdminList<OrganizationUnitListResponse, OrganizationUnitBasic>({
  base: BaseOrganizationUnitList,
  errorKey: 'admin.organization_units.list.error',
  extraProps: {
    /** Lists the children of this organization unit. Lists the root units when omitted. */
    parentId: {default: undefined, type: String},
  },
  name: 'OrganizationUnitList',
  query: (params: () => Record<string, unknown>): ResourceQueryResult<OrganizationUnitListResponse> => {
    const endpoint: ManagementEndpoint = useManagementEndpoint('organizationUnits');
    const read = (): {limit?: number; offset?: number; parentId?: string} =>
      params() as {limit?: number; offset?: number; parentId?: string};

    return useResourceQuery(
      () => {
        const {limit, offset, parentId} = read();

        return parentId
          ? [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN, parentId, {limit, offset}]
          : [OrganizationUnitQueryKeys.ORGANIZATION_UNITS, {limit, offset}];
      },
      (fetcher) => {
        const {limit, offset, parentId} = read();

        return parentId
          ? getOrganizationUnitChildren({...endpoint, fetcher, limit, offset, ouId: parentId})
          : getOrganizationUnits({...endpoint, fetcher, limit, offset});
      },
    );
  },
  rows: (data: OrganizationUnitListResponse | undefined) => data?.organizationUnits ?? [],
  rowsProp: 'organizationUnits',
  selectedProp: 'selectedOrganizationUnitId',
  total: (data: OrganizationUnitListResponse | undefined) => data?.totalResults,
});

export default OrganizationUnitList;
