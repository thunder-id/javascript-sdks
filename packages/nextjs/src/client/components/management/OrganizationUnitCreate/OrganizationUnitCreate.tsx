// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  OrganizationUnitCreate as ReactOrganizationUnitCreate,
  OrganizationUnitCreateProps as ReactOrganizationUnitCreateProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type OrganizationUnitCreateProps = ReactOrganizationUnitCreateProps;

/**
 * Creates an organization unit.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <OrganizationUnitCreate parentId={unitId} onCreated={(unit) => router.push(`/admin/units/${unit.id}`)} />
 * ```
 */
const OrganizationUnitCreate: FC<OrganizationUnitCreateProps> = (props: OrganizationUnitCreateProps): ReactElement => (
  <ReactOrganizationUnitCreate {...props} />
);

OrganizationUnitCreate.displayName = 'OrganizationUnitCreate';

export default OrganizationUnitCreate;
