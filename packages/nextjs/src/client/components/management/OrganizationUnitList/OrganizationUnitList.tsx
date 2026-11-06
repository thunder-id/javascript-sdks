// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  OrganizationUnitList as ReactOrganizationUnitList,
  OrganizationUnitListProps as ReactOrganizationUnitListProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type OrganizationUnitListProps = ReactOrganizationUnitListProps;

/**
 * Lists organization units, a page at a time: the root units, or the children of `parentId`.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <OrganizationUnitList parentId={projectId} onSelect={(unit) => router.push(`/admin/units/${unit.id}`)} />
 * ```
 */
const OrganizationUnitList: FC<OrganizationUnitListProps> = (props: OrganizationUnitListProps): ReactElement => (
  <ReactOrganizationUnitList {...props} />
);

OrganizationUnitList.displayName = 'OrganizationUnitList';

export default OrganizationUnitList;
