// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  OrganizationUnitListResponse,
  OrganizationUnitQueryKeys,
  getOrganizationUnitChildren,
  getOrganizationUnits,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseOrganizationUnitList, {BaseOrganizationUnitListProps} from './BaseOrganizationUnitList';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type OrganizationUnitListProps = Omit<
  BaseOrganizationUnitListProps,
  'error' | 'isLoading' | 'offset' | 'onPageChange' | 'organizationUnits' | 'totalResults'
> & {
  /**
   * Lists the children of this organization unit. Lists the root units when omitted.
   */
  parentId?: string;
};

/**
 * Lists organization units, a page at a time: the root units, or the children of `parentId`.
 *
 * @example
 * ```tsx
 * <OrganizationUnitList parentId={projectId} onSelect={(unit) => setSelectedUnitId(unit.id)} />
 * ```
 */
const OrganizationUnitList: FC<OrganizationUnitListProps> = ({
  limit = 20,
  parentId,
  preferences,
  ...rest
}: OrganizationUnitListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const endpoint: ManagementEndpoint = useManagementEndpoint('organizationUnits');
  const {data, error, isLoading}: ResourceQueryResult<OrganizationUnitListResponse> = useResourceQuery(
    parentId
      ? [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN, parentId, {limit, offset}]
      : [OrganizationUnitQueryKeys.ORGANIZATION_UNITS, {limit, offset}],
    (fetcher) =>
      parentId
        ? getOrganizationUnitChildren({...endpoint, fetcher, limit, offset, ouId: parentId})
        : getOrganizationUnits({...endpoint, fetcher, limit, offset}),
  );

  const [listedParentId, setListedParentId] = useState<string | undefined>(parentId);

  // A different parent starts from its first page.
  if (listedParentId !== parentId) {
    setListedParentId(parentId);
    setOffset(0);
  }

  return (
    <BaseOrganizationUnitList
      organizationUnits={data?.organizationUnits ?? []}
      totalResults={data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.organization_units.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      preferences={preferences}
      {...rest}
    />
  );
};

export default OrganizationUnitList;
